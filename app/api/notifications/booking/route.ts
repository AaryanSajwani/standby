import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { bookingDecisionEmail, bookingRequestedEmail, sendEmail, type BookingEmailData } from "@/lib/notifications"

// POST { bookingId, event: "requested" | "accepted" | "declined" }
//
// Fired (fire-and-forget) by the client after a successful booking insert or
// status update. Untrusted by design: the caller only names a booking and an
// event — everything in the email comes from the DB row, the caller must be
// the right participant for the claimed event, and the claimed event must
// match the stored status. Recipient emails are resolved SERVER-SIDE with the
// service role (migration 0008 revoked the old authenticated RPC) so raw
// auth.users emails are never returned to the caller.

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
    .select("id, organizer_id, emt_id, event_name, event_date, location, duration_hours, rate_cents, notes, status")
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

  // Participant emails + display names. auth.users emails are not readable by
  // anon/authenticated (and must never be handed back to the caller), so we
  // resolve them with the service role AFTER the participant + consistency
  // checks above have established the caller is entitled to this notification.
  // Best-effort: if the service key isn't configured the send is skipped and
  // the in-app flow stays the source of truth.
  const admin = createAdminClient()
  if (!admin) {
    console.error("[notifications] SUPABASE_SERVICE_ROLE_KEY not set — skipping send")
    return NextResponse.json({ sent: false, reason: "recipient_lookup_failed" })
  }

  const [orgUser, emtUser, orgProfile, emtProfile] = await Promise.all([
    admin.auth.admin.getUserById(bk.organizer_id),
    admin.auth.admin.getUserById(bk.emt_id),
    admin.from("profiles").select("full_name").eq("id", bk.organizer_id).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", bk.emt_id).maybeSingle(),
  ])

  const organizerEmail = orgUser.data.user?.email
  const emtEmail = emtUser.data.user?.email
  if (!organizerEmail || !emtEmail) {
    console.error("[notifications] recipient lookup failed: missing participant email")
    return NextResponse.json({ sent: false, reason: "recipient_lookup_failed" })
  }
  const info = {
    organizer_email: organizerEmail,
    organizer_name: orgProfile.data?.full_name || "An organizer",
    emt_email: emtEmail,
    emt_name: emtProfile.data?.full_name || "The medic",
  }

  // Dedupe claim (migration 0007): the PK on (booking_id, event) makes this
  // race-safe — exactly one caller wins, so re-POSTing the same booking/event
  // can't fire duplicate emails. 23505 = already claimed. Any other error
  // (e.g. migration not applied yet) logs and continues — sends stay best-effort.
  const { error: claimError } = await supabase
    .from("booking_notifications")
    .insert({ booking_id: bookingId, event })
  if (claimError) {
    if (claimError.code === "23505") {
      return NextResponse.json({ sent: false, reason: "already_notified" })
    }
    console.error("[notifications] dedupe claim failed (continuing):", claimError.message)
  }

  const data: BookingEmailData = {
    eventName: bk.event_name,
    eventDate: bk.event_date,
    location: bk.location,
    durationHours: Number(bk.duration_hours) || 0,
    offeredRate: (bk.rate_cents ?? 0) / 100,
    notes: bk.notes,
  }
  // Email CTA links: prefer the canonical origin over the request's Host
  // header (host-header-injected phishing links are a class worth removing
  // even though Vercel validates Host). Set SITE_URL in Vercel env.
  const origin = process.env.SITE_URL ?? new URL(request.url).origin

  const { subject, html } =
    event === "requested"
      ? bookingRequestedEmail(data, info.organizer_name, origin)
      : bookingDecisionEmail(data, info.emt_name, event, origin)
  const to = event === "requested" ? info.emt_email : info.organizer_email

  const sent = await sendEmail(to, subject, html)
  return NextResponse.json({ sent })
}
