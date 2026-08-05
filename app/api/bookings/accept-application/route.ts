import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { planAcceptance, type ApplicationRow } from "@/lib/bookings/applications"
import { assertTransition } from "@/lib/bookings/state-machine"
import { openSlotAcceptedEmail, sendEmail, type BookingEmailData } from "@/lib/notifications"

// POST { applicationId }
//
// The organizer accepts ONE medic's request to fill an open slot. This is the
// multi-row, atomic half of the open-claim flow, so it runs SERVER-SIDE with the
// service role (bypassing RLS) AFTER authorizing the caller as the slot's
// organizer. The plan (accept the chosen application, reject the still-`applied`
// siblings, move the booking open → accepted) is the unit-tested planAcceptance()
// in lib/bookings/applications.ts; the booking transition is validated by the
// state machine and enforced again by the 0009 DB trigger.
//
// Untrusted by design: the caller names only an application id. We resolve the
// booking under the caller's RLS (so a non-organizer can't even see it), confirm
// the caller owns it and it is still open, THEN switch to the service role.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { applicationId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const applicationId = typeof body.applicationId === "string" ? body.applicationId : ""
  if (!UUID_RE.test(applicationId)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }

  // Read the application under the caller's RLS — the "applications visibility"
  // policy (0011) returns it only to the applying medic or the booking's
  // organizer, so a stranger gets nothing here.
  const { data: app, error: appError } = await supabase
    .from("booking_applications")
    .select("id, booking_id, emt_id, status")
    .eq("id", applicationId)
    .maybeSingle()
  if (appError || !app) return NextResponse.json({ error: "not_found" }, { status: 404 })

  // Confirm the caller is the booking's ORGANIZER and the slot is still open.
  // organizer_select_own (0008) means a non-owner can't read the row at all.
  const { data: booking, error: bkError } = await supabase
    .from("bookings")
    .select("id, organizer_id, status")
    .eq("id", app.booking_id)
    .maybeSingle()
  if (bkError || !booking) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (booking.organizer_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  if (booking.status !== "open") {
    return NextResponse.json({ error: "not_open", reason: "Slot is no longer open." }, { status: 409 })
  }

  // Validate the booking transition here too (defence in depth; the 0009 trigger
  // is the DB backstop). Throws → the slot isn't in a state we can accept from.
  try {
    assertTransition("open", "accepted", "organizer")
  } catch {
    return NextResponse.json({ error: "illegal_transition" }, { status: 409 })
  }

  const admin = createAdminClient()
  if (!admin) {
    console.error("[accept-application] SUPABASE_SERVICE_ROLE_KEY not set — cannot accept")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }

  // Load EVERY application on this booking (service role — the organizer can see
  // them under RLS anyway, but the plan must be computed over the full set).
  const { data: allApps, error: allError } = await admin
    .from("booking_applications")
    .select("id, status")
    .eq("booking_id", app.booking_id)
  if (allError || !allApps) {
    console.error("[accept-application] could not load applications:", allError?.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  let plan
  try {
    plan = planAcceptance(allApps as ApplicationRow[], applicationId)
  } catch (e) {
    // Target not found or no longer `applied` (already decided/withdrawn).
    return NextResponse.json({ error: "not_applicable", reason: (e as Error).message }, { status: 409 })
  }

  // Apply the plan. Supabase JS has no multi-statement transaction, so order the
  // writes so a partial failure is recoverable and never double-books:
  //   1. Move the booking open → accepted and set emt_id. This is the guarded,
  //      single-winner step — the 0009 trigger only allows open → accepted once,
  //      so a concurrent second accept on the same slot fails here.
  const { data: updatedRows, error: bookingUpdErr } = await admin
    .from("bookings")
    .update({ emt_id: app.emt_id, status: "accepted" })
    .eq("id", app.booking_id)
    .eq("status", "open") // guard: only transition from open (idempotency / race)
    .select("id")
  if (bookingUpdErr) {
    console.error("[accept-application] booking update failed:", bookingUpdErr.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  // Zero rows updated ⇒ the slot was filled between our read and write (concurrent
  // accept, or a double-submit). Do NOT touch the applications — the winning call
  // already assigned this booking. Report the conflict; the target medic may have
  // been taken by another slot's accept.
  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json(
      { error: "not_open", reason: "This slot was just filled — refresh to see the current roster." },
      { status: 409 }
    )
  }

  //   2. Mark the chosen application accepted and the still-applied siblings
  //      rejected. If these lag, the booking is already correctly assigned;
  //      failures are logged, not fatal (a reconcile job can settle stragglers).
  const { error: acceptErr } = await admin
    .from("booking_applications")
    .update({ status: "accepted" })
    .eq("id", plan.acceptId)
  if (acceptErr) console.error("[accept-application] accept mark failed:", acceptErr.message)

  if (plan.rejectIds.length > 0) {
    const { error: rejectErr } = await admin
      .from("booking_applications")
      .update({ status: "rejected" })
      .in("id", plan.rejectIds)
    if (rejectErr) console.error("[accept-application] sibling reject failed:", rejectErr.message)
  }

  //   3. Append the audit-trail row (0009). Best-effort — the status change above
  //      is the source of truth.
  const { error: trailErr } = await admin.from("booking_state_transitions").insert({
    booking_id: app.booking_id,
    from_status: "open",
    to_status: "accepted",
    actor_user_id: user.id,
    actor_role: "organizer",
    reason: "Organizer accepted a medic's claim on an open slot",
    metadata: { application_id: plan.acceptId, rejected: plan.rejectIds.length },
  })
  if (trailErr) console.error("[accept-application] audit insert failed (continuing):", trailErr.message)

  // Best-effort: email the accepted medic they got the slot. Open-claim's
  // counterpart to the direct-request "requested" email. Resolve the medic's
  // email server-side with the service role (never returned to the caller), and
  // rebuild the content from the DB row. Failure never blocks the accept.
  try {
    const [{ data: fullBooking }, medicUser, orgProfile] = await Promise.all([
      admin
        .from("bookings")
        .select("event_name, event_date, location, duration_hours, offered_rate, notes")
        .eq("id", app.booking_id)
        .maybeSingle(),
      admin.auth.admin.getUserById(app.emt_id as string),
      admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    ])
    const medicEmail = medicUser.data.user?.email
    if (fullBooking && medicEmail) {
      const data: BookingEmailData = {
        eventName: fullBooking.event_name,
        eventDate: fullBooking.event_date,
        location: fullBooking.location,
        durationHours: Number(fullBooking.duration_hours) || 0,
        offeredRate: fullBooking.offered_rate,
        notes: fullBooking.notes,
      }
      const origin = process.env.SITE_URL ?? new URL(request.url).origin
      const { subject, html } = openSlotAcceptedEmail(
        data,
        orgProfile.data?.full_name || "The organizer",
        origin,
        app.booking_id as string
      )
      void sendEmail(medicEmail, subject, html)
    }
  } catch (e) {
    console.error("[accept-application] medic notify failed (continuing):", e)
  }

  return NextResponse.json({
    ok: true,
    bookingId: app.booking_id,
    acceptedEmtId: app.emt_id,
    rejected: plan.rejectIds.length,
  })
}
