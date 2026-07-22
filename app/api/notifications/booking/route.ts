import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { bookingDecisionEmail, bookingRequestedEmail, sendEmail, type BookingEmailData } from "@/lib/notifications"

// POST { bookingId, event: "requested" | "accepted" | "declined" }
//
// Fired (fire-and-forget) by the client after a successful booking insert or
// status update. Untrusted by design: the caller only names a booking and an
// event — everything in the email comes from the DB row, the caller must be
// the right participant for the claimed event, and the claimed event must
// match the stored status. Recipient emails come from the security-definer
// RPC in migration 0006 (auth.users is not readable any other way).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EVENTS = ["requested", "accepted", "declined"] as const
type NotifyEvent = (typeof EVENTS)[number]

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { bookingId?: unknown; event?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const bookingId = typeof body.bookingId === "string" ? body.bookingId : ""
  const event = body.event as NotifyEvent
  if (!UUID_RE.test(bookingId) || !EVENTS.includes(event)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }

  // Load under RLS — a non-participant can't even see the row.
  const { data: bk, error: bkError } = await supabase
    .from("bookings")
    .select("id, organizer_id, emt_id, event_name, event_date, location, duration_hours, offered_rate, notes, status")
    .eq("id", bookingId)
    .maybeSingle()
  if (bkError || !bk) return NextResponse.json({ error: "not_found" }, { status: 404 })

  // The claimed event must match reality: only the organizer announces a new
  // request (while it's still pending); only the EMT announces a decision, and
  // the decision must equal the stored status.
  const consistent =
    event === "requested"
      ? bk.organizer_id === user.id && bk.status === "pending"
      : bk.emt_id === user.id && bk.status === event
  if (!consistent) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  // Participant emails + display names (migration 0006). If the migration
  // isn't applied yet the RPC errors — skip the email, in-app flow is truth.
  const { data: rpcData, error: rpcError } = await supabase
    .rpc("booking_notification_info", { p_booking_id: bookingId })
    .maybeSingle()
  // Untyped client — the RPC's row shape comes from migration 0006
  const info = rpcData as {
    organizer_email: string
    organizer_name: string
    emt_email: string
    emt_name: string
  } | null
  if (rpcError || !info) {
    if (rpcError) console.error("[notifications] recipient lookup failed:", rpcError.message)
    return NextResponse.json({ sent: false, reason: "recipient_lookup_failed" })
  }

  const data: BookingEmailData = {
    eventName: bk.event_name,
    eventDate: bk.event_date,
    location: bk.location,
    durationHours: Number(bk.duration_hours) || 0,
    offeredRate: bk.offered_rate,
    notes: bk.notes,
  }
  const origin = new URL(request.url).origin

  const { subject, html } =
    event === "requested"
      ? bookingRequestedEmail(data, info.organizer_name, origin)
      : bookingDecisionEmail(data, info.emt_name, event, origin)
  const to = event === "requested" ? info.emt_email : info.organizer_email

  const sent = await sendEmail(to, subject, html)
  return NextResponse.json({ sent })
}
