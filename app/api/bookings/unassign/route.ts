import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertTransition, IllegalBookingTransitionError } from "@/lib/bookings/state-machine"
import { slotUnassignedEmail, sendEmail, type BookingEmailData } from "@/lib/notifications"

// POST { bookingId, reason? }  — organizer removes an ACCEPTED medic (Phase 3).
//
//   accepted → open   (slot reopens at the SAME slot_index — never renumbered)
//
// Only from `accepted`: a `checked_in` medic cannot be unassigned (they are on
// site — a different problem). We authenticate the caller, read the booking with
// the service role, authorize by organizer_id, then guard the write on
// status='accepted' so a concurrent check-in/cancel can't race. The removed medic
// is always notified — silent removal burns the scarce side (staffing-slots skill).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { bookingId?: unknown; reason?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const bookingId = typeof body.bookingId === "string" ? body.bookingId : ""
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 1000) : null
  if (!UUID_RE.test(bookingId)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    console.error("[bookings/unassign] SUPABASE_SERVICE_ROLE_KEY not set")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }

  const { data: booking, error: bkErr } = await admin
    .from("bookings")
    .select("id, organizer_id, emt_id, status, starts_at, event_date, duration_hours, event_name, location, offered_rate, notes")
    .eq("id", bookingId)
    .maybeSingle()
  if (bkErr || !booking) return NextResponse.json({ error: "not_found" }, { status: 404 })

  if (booking.organizer_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  // Distinguish the on-site case from a stale/absent assignment so the UI can
  // explain rather than showing a generic failure.
  if (booking.status === "checked_in") {
    return NextResponse.json(
      { error: "checked_in", reason: "This medic already checked in on site and can't be removed here." },
      { status: 409 }
    )
  }
  if (booking.status !== "accepted") {
    return NextResponse.json(
      { error: "not_assigned", reason: "This slot no longer has a confirmed medic." },
      { status: 409 }
    )
  }

  try {
    assertTransition("accepted", "open", "organizer")
  } catch (e) {
    if (e instanceof IllegalBookingTransitionError) return NextResponse.json({ error: "illegal_transition" }, { status: 409 })
    throw e
  }

  const removedMedicId = booking.emt_id // capture before we null it
  const hoursToStart = booking.starts_at ? (new Date(booking.starts_at).getTime() - Date.now()) / 3_600_000 : null

  // Reopen the slot at the same index. Null the confirmed medic + the snapshotted
  // rate. Guarded on status='accepted' so a concurrent check-in/cancel loses.
  const { data: updated, error: updErr } = await admin
    .from("bookings")
    .update({ status: "open", emt_id: null, rate_cents: null, accepted_at: null })
    .eq("id", bookingId)
    .eq("status", "accepted")
    .select("id")
  if (updErr) {
    console.error("[bookings/unassign] update failed:", updErr.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "not_assigned", reason: "This assignment just changed — refresh and try again." }, { status: 409 })
  }

  await admin.from("booking_state_transitions").insert({
    booking_id: bookingId,
    from_status: "accepted",
    to_status: "open",
    actor_user_id: user.id,
    actor_role: "organizer",
    reason: "Organizer removed the medic; slot reopened",
    hours_to_event_start: hoursToStart,
    metadata: reason ? { note: reason } : {},
  })

  // Notify the removed medic (best-effort) — mandatory in spirit, best-effort in
  // delivery (missing Resend key / domain → logged skip, in-app is source of truth).
  try {
    if (removedMedicId) {
      const emailData: BookingEmailData = {
        eventName: booking.event_name,
        eventDate: booking.event_date,
        location: booking.location,
        durationHours: Number(booking.duration_hours) || 0,
        offeredRate: booking.offered_rate,
        notes: booking.notes,
      }
      const origin = process.env.SITE_URL ?? new URL(request.url).origin
      const [medicUser, { data: orgProfile }] = await Promise.all([
        admin.auth.admin.getUserById(removedMedicId),
        admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      ])
      const medicEmail = medicUser.data.user?.email
      if (medicEmail) {
        const { subject, html } = slotUnassignedEmail(emailData, orgProfile?.full_name || "The organizer", origin)
        void sendEmail(medicEmail, subject, html)
      }
    }
  } catch (e) {
    console.error("[bookings/unassign] notify failed (continuing):", e)
  }

  return NextResponse.json({ ok: true, bookingId, status: "open" })
}
