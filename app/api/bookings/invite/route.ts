import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertTransition, IllegalBookingTransitionError } from "@/lib/bookings/state-machine"
import { checkMedicEligibility, type MedicBooking } from "@/lib/bookings/fill"
import { slotInvitationEmail, sendEmail, type BookingEmailData } from "@/lib/notifications"

// POST { bookingId, emtId }
//
// The organizer invites ONE specific verified medic to an OPEN slot, HOLDING it
// as `invited` until the medic replies (Phase 2 direct-request-on-a-slot). The
// medic is validated at invite time AND re-validated at fill time (staffing-slots
// #2). We authorize the organizer under their own RLS (organizer_select_own),
// then switch to the service role for the credential read (license_expiry is PII,
// not readable by the organizer) and the write.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HELD_MS = 24 * 60 * 60 * 1000 // default hold window
const LEAD_MS = 12 * 60 * 60 * 1000 // invitation must close ≥12h before start

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { bookingId?: unknown; emtId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const bookingId = typeof body.bookingId === "string" ? body.bookingId : ""
  const emtId = typeof body.emtId === "string" ? body.emtId : ""
  if (!UUID_RE.test(bookingId) || !UUID_RE.test(emtId)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }

  // Authorize under the caller's RLS: only the slot's organizer can read it, and
  // it must still be open. organizer_select_own (0008) hides it from everyone else.
  const { data: booking, error: bkErr } = await supabase
    .from("bookings")
    .select("id, organizer_id, status, event_id, starts_at, event_date, duration_hours, event_name, location, offered_rate, notes")
    .eq("id", bookingId)
    .maybeSingle()
  if (bkErr || !booking) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (booking.organizer_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  if (booking.status !== "open") {
    return NextResponse.json({ error: "not_open", reason: "This slot is no longer open." }, { status: 409 })
  }

  try {
    assertTransition("open", "invited", "organizer")
  } catch (e) {
    if (e instanceof IllegalBookingTransitionError) {
      return NextResponse.json({ error: "illegal_transition" }, { status: 409 })
    }
    throw e
  }

  // Invitation deadline: min(now+24h, start−12h). Too close to start ⇒ refuse
  // rather than mint an already-expired hold.
  const now = Date.now()
  const cap = booking.starts_at ? new Date(booking.starts_at).getTime() - LEAD_MS : Infinity
  const expiresMs = Math.min(now + HELD_MS, cap)
  if (expiresMs <= now) {
    return NextResponse.json({ error: "too_late", reason: "Too close to the event start to invite." }, { status: 409 })
  }

  const admin = createAdminClient()
  if (!admin) {
    console.error("[bookings/invite] SUPABASE_SERVICE_ROLE_KEY not set")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }

  // If this medic already applied to this slot, don't double-track it as an
  // invitation — the organizer should accept their application instead.
  const { data: existingApp } = await admin
    .from("booking_applications")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("emt_id", emtId)
    .eq("status", "applied")
    .maybeSingle()
  if (existingApp) {
    return NextResponse.json(
      { error: "applicant_exists", reason: "This medic already applied — accept their application instead." },
      { status: 409 }
    )
  }

  // Credential read (service role — license_expiry is PII the organizer can't see)
  // + the medic's other committed shifts for the overlap check.
  const [{ data: medic }, { data: others }] = await Promise.all([
    admin.from("emt_profiles").select("verified, license_expiry, hourly_rate").eq("user_id", emtId).maybeSingle(),
    admin
      .from("bookings")
      .select("status, starts_at, event_date, duration_hours")
      .eq("emt_id", emtId)
      .in("status", ["accepted", "confirmed", "checked_in"])
      .neq("id", bookingId),
  ])

  const ineligible = checkMedicEligibility(
    { starts_at: booking.starts_at, event_date: booking.event_date, duration_hours: Number(booking.duration_hours) || 0 },
    medic ? { verified: medic.verified, license_expiry: medic.license_expiry, hourly_rate: Number(medic.hourly_rate) } : null,
    (others ?? []) as MedicBooking[]
  )
  if (ineligible) {
    return NextResponse.json({ error: ineligible }, { status: 409 })
  }

  const invitationExpiresAt = new Date(expiresMs).toISOString()

  // Hold the slot. Guard on status='open' so a concurrent invite/accept can't
  // both hold it — the loser gets 0 rows.
  const { data: updated, error: updErr } = await admin
    .from("bookings")
    .update({
      status: "invited",
      invited_emt_id: emtId,
      invited_at: new Date(now).toISOString(),
      invitation_expires_at: invitationExpiresAt,
    })
    .eq("id", bookingId)
    .eq("status", "open")
    .select("id")
  if (updErr) {
    console.error("[bookings/invite] update failed:", updErr.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "not_open", reason: "This slot was just taken." }, { status: 409 })
  }

  // Audit (best-effort; the status change above is the source of truth).
  const hoursToStart = booking.starts_at ? (new Date(booking.starts_at).getTime() - now) / 3_600_000 : null
  const { error: auditErr } = await admin.from("booking_state_transitions").insert({
    booking_id: bookingId,
    from_status: "open",
    to_status: "invited",
    actor_user_id: user.id,
    actor_role: "organizer",
    reason: "Organizer invited a medic to the slot (held)",
    hours_to_event_start: hoursToStart,
    metadata: { invited_emt_id: emtId },
  })
  if (auditErr) console.error("[bookings/invite] audit insert failed (continuing):", auditErr.message)

  // Best-effort: email the invited medic (scarce side). Resolve their email
  // server-side; never return it to the caller.
  try {
    const [medicUser, orgProfile] = await Promise.all([
      admin.auth.admin.getUserById(emtId),
      admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    ])
    const medicEmail = medicUser.data.user?.email
    if (medicEmail) {
      const data: BookingEmailData = {
        eventName: booking.event_name,
        eventDate: booking.event_date,
        location: booking.location,
        durationHours: Number(booking.duration_hours) || 0,
        offeredRate: booking.offered_rate,
        notes: booking.notes,
      }
      const origin = process.env.SITE_URL ?? new URL(request.url).origin
      const { subject, html } = slotInvitationEmail(data, orgProfile.data?.full_name || "The organizer", origin, invitationExpiresAt)
      void sendEmail(medicEmail, subject, html)
    }
  } catch (e) {
    console.error("[bookings/invite] medic notify failed (continuing):", e)
  }

  return NextResponse.json({ ok: true, bookingId, status: "invited", invitationExpiresAt })
}
