import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertTransition, IllegalBookingTransitionError } from "@/lib/bookings/state-machine"
import { planFill, type MedicBooking } from "@/lib/bookings/fill"
import { bookingDecisionEmail, slotRescindedEmail, sendEmail, type BookingEmailData } from "@/lib/notifications"

// POST { bookingId, action: "accept" | "decline" | "rescind", reason? }
//
//   • accept  (medic)      invited → accepted  — the HELD-PATH FILL (planFill)
//   • decline (medic)      invited → open
//   • rescind (organizer)  invited → open
//
// The medic cannot SELECT their own `invited` booking under current RLS (that
// policy is Phase 5), so we authenticate the caller, read the booking with the
// SERVICE ROLE, then authorize by explicit id comparison (invited_emt_id for the
// medic actions, organizer_id for rescind) before any write. Every write is
// guarded on status='invited' so a concurrent expire/rescind/accept can't race.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ACTIONS = new Set(["accept", "decline", "rescind"])

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { bookingId?: unknown; action?: unknown; reason?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const bookingId = typeof body.bookingId === "string" ? body.bookingId : ""
  const action = typeof body.action === "string" ? body.action : ""
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 1000) : null
  if (!UUID_RE.test(bookingId) || !ACTIONS.has(action)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    console.error("[bookings/invitation] SUPABASE_SERVICE_ROLE_KEY not set")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }

  // Service-role read (the invited medic can't see this row under current RLS).
  const { data: booking, error: bkErr } = await admin
    .from("bookings")
    .select("id, organizer_id, emt_id, invited_emt_id, status, invitation_expires_at, starts_at, event_date, duration_hours, event_name, location, offered_rate, notes")
    .eq("id", bookingId)
    .maybeSingle()
  if (bkErr || !booking) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (booking.status !== "invited") {
    return NextResponse.json({ error: "not_invited", reason: "This slot no longer has a pending invitation." }, { status: 409 })
  }

  // Per-action authorization by explicit id comparison.
  const isInvitedMedic = booking.invited_emt_id === user.id
  const isOrganizer = booking.organizer_id === user.id
  if ((action === "accept" || action === "decline") && !isInvitedMedic) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  if (action === "rescind" && !isOrganizer) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const now = new Date().toISOString()
  const hoursToStart = booking.starts_at ? (new Date(booking.starts_at).getTime() - Date.now()) / 3_600_000 : null
  const emailData: BookingEmailData = {
    eventName: booking.event_name,
    eventDate: booking.event_date,
    location: booking.location,
    durationHours: Number(booking.duration_hours) || 0,
    offeredRate: booking.offered_rate,
    notes: booking.notes,
  }
  const origin = process.env.SITE_URL ?? new URL(request.url).origin

  // ── ACCEPT: the held-path fill ─────────────────────────────────────────────
  if (action === "accept") {
    // Enforce the deadline at accept time — don't rely on the reopen cron having
    // run (spec test 4: an expired invitation cannot be accepted). Decline and
    // rescind stay allowed on an expired-but-still-held slot.
    if (booking.invitation_expires_at && Date.parse(booking.invitation_expires_at) <= Date.now()) {
      return NextResponse.json({ error: "expired", reason: "This invitation has expired." }, { status: 409 })
    }

    // Re-validate at fill time (certs lapse, medics double-book between invite
    // and accept). Credential + overlap reads via service role.
    const [{ data: medic }, { data: others }] = await Promise.all([
      admin.from("emt_profiles").select("verified, license_expiry, hourly_rate").eq("user_id", user.id).maybeSingle(),
      admin
        .from("bookings")
        .select("status, starts_at, event_date, duration_hours")
        .eq("emt_id", user.id)
        .in("status", ["accepted", "confirmed", "checked_in"])
        .neq("id", bookingId),
    ])

    const result = planFill(
      {
        status: booking.status,
        invited_emt_id: booking.invited_emt_id,
        starts_at: booking.starts_at,
        event_date: booking.event_date,
        duration_hours: Number(booking.duration_hours) || 0,
      },
      medic ? { verified: medic.verified, license_expiry: medic.license_expiry, hourly_rate: Number(medic.hourly_rate) } : null,
      user.id,
      "invitation",
      (others ?? []) as MedicBooking[]
    )
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 })

    try {
      assertTransition("invited", "accepted", "emt")
    } catch (e) {
      if (e instanceof IllegalBookingTransitionError) return NextResponse.json({ error: "illegal_transition" }, { status: 409 })
      throw e
    }

    // Fill. Guard on status='invited' AND invited_emt_id=me so a concurrent
    // rescind/expire (which clears both) loses.
    const { data: updated, error: updErr } = await admin
      .from("bookings")
      .update({
        status: "accepted",
        emt_id: user.id,
        rate_cents: result.plan.rate_cents,
        accepted_at: now,
        invited_emt_id: null,
        invited_at: null,
        invitation_expires_at: null,
      })
      .eq("id", bookingId)
      .eq("status", "invited")
      .eq("invited_emt_id", user.id)
      .select("id")
    if (updErr) {
      console.error("[bookings/invitation] accept update failed:", updErr.message)
      return NextResponse.json({ error: "server_error" }, { status: 500 })
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: "not_invited", reason: "This invitation was just withdrawn." }, { status: 409 })
    }

    await admin.from("booking_state_transitions").insert({
      booking_id: bookingId,
      from_status: "invited",
      to_status: "accepted",
      actor_user_id: user.id,
      actor_role: "emt",
      reason: "Medic accepted the invitation",
      hours_to_event_start: hoursToStart,
      metadata: { rate_cents: result.plan.rate_cents },
    })

    // Notify the organizer (best-effort).
    try {
      const [{ data: medicProfile }, orgUser] = await Promise.all([
        admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        admin.auth.admin.getUserById(booking.organizer_id),
      ])
      const orgEmail = orgUser.data.user?.email
      if (orgEmail) {
        const { subject, html } = bookingDecisionEmail(emailData, medicProfile?.full_name || "Your medic", "accepted", origin)
        void sendEmail(orgEmail, subject, html)
      }
    } catch (e) {
      console.error("[bookings/invitation] organizer notify failed (continuing):", e)
    }

    return NextResponse.json({ ok: true, bookingId, status: "accepted" })
  }

  // ── DECLINE (medic) / RESCIND (organizer): return the slot to open ─────────
  const actor = action === "decline" ? "emt" : "organizer"
  try {
    assertTransition("invited", "open", actor)
  } catch (e) {
    if (e instanceof IllegalBookingTransitionError) return NextResponse.json({ error: "illegal_transition" }, { status: 409 })
    throw e
  }

  const invitedMedicId = booking.invited_emt_id // capture before we null it
  const { data: updated, error: updErr } = await admin
    .from("bookings")
    .update({ status: "open", invited_emt_id: null, invited_at: null, invitation_expires_at: null })
    .eq("id", bookingId)
    .eq("status", "invited")
    .select("id")
  if (updErr) {
    console.error("[bookings/invitation] release update failed:", updErr.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "not_invited" }, { status: 409 })
  }

  await admin.from("booking_state_transitions").insert({
    booking_id: bookingId,
    from_status: "invited",
    to_status: "open",
    actor_user_id: user.id,
    actor_role: actor,
    reason: action === "decline" ? "Medic declined the invitation" : "Organizer rescinded the invitation",
    hours_to_event_start: hoursToStart,
    metadata: reason ? { note: reason } : {},
  })

  // Notify the counterparty (best-effort): decline → organizer, rescind → medic.
  try {
    if (action === "decline") {
      const [{ data: medicProfile }, orgUser] = await Promise.all([
        admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        admin.auth.admin.getUserById(booking.organizer_id),
      ])
      const orgEmail = orgUser.data.user?.email
      if (orgEmail) {
        const { subject, html } = bookingDecisionEmail(emailData, medicProfile?.full_name || "The medic", "declined", origin)
        void sendEmail(orgEmail, subject, html)
      }
    } else if (invitedMedicId) {
      const [medicUser, { data: orgProfile }] = await Promise.all([
        admin.auth.admin.getUserById(invitedMedicId),
        admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      ])
      const medicEmail = medicUser.data.user?.email
      if (medicEmail) {
        const { subject, html } = slotRescindedEmail(emailData, orgProfile?.full_name || "The organizer", origin)
        void sendEmail(medicEmail, subject, html)
      }
    }
  } catch (e) {
    console.error("[bookings/invitation] release notify failed (continuing):", e)
  }

  return NextResponse.json({ ok: true, bookingId, status: "open" })
}
