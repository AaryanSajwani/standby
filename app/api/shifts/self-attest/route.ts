import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertTransition } from "@/lib/bookings/state-machine"
import { isSelfAttestOpen, toMillis } from "@/lib/shifts/timing"
import { selfAttestCheckInEmail, sendEmail, type BookingEmailData } from "@/lib/notifications"
import { rateLimit } from "@/lib/rate-limit"

// POST { bookingId, latitude?, longitude?, accuracy?, note?, photoPath? }
//
// The 30-minute self-attest FALLBACK. When no organizer verification lands within
// 30 min of the shift start, the assigned medic attests they're on site — with
// best-effort geolocation, an optional Storage photo (uploaded client-side to the
// owner's own folder in check-in-attestations, 0013), and an optional note. This
// is a lower-assurance check-in (verification_quality='self_attested',
// method='fallback') than the organizer-verified code path, so the organizer is
// emailed. The booking transition (accepted → checked_in) is guarded on the prior
// status, which also makes the whole action idempotent: only the first call moves
// the booking and sends the email.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_NOTE = 600
// A handful of attempts per (booking, medic) — enough to retry a transient
// failure, not enough to hammer the fallback.
const ATTEST_LIMIT = 6
const ATTEST_WINDOW_MS = 60_000

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: {
    bookingId?: unknown
    latitude?: unknown
    longitude?: unknown
    accuracy?: unknown
    note?: unknown
    photoPath?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const bookingId = typeof body.bookingId === "string" ? body.bookingId : ""
  if (!UUID_RE.test(bookingId)) return NextResponse.json({ error: "bad_request" }, { status: 400 })

  const verdict = rateLimit(`shift-self-attest:${bookingId}:${user.id}`, ATTEST_LIMIT, ATTEST_WINDOW_MS)
  if (!verdict.ok) {
    return NextResponse.json(
      { error: "too_many_attempts", retryAfterSec: verdict.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfterSec) } }
    )
  }

  // Load under RLS (emt_select_assigned → only the assigned medic sees it).
  const { data: bk } = await supabase
    .from("bookings")
    .select("id, organizer_id, emt_id, event_name, event_date, location, duration_hours, rate_cents, notes, status, starts_at")
    .eq("id", bookingId)
    .maybeSingle()
  if (!bk) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (bk.emt_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  if (bk.status !== "accepted") {
    return NextResponse.json(
      { error: "wrong_phase", reason: "This shift isn't awaiting check-in." },
      { status: 409 }
    )
  }

  // The fallback is only available once we're at least 30 min past a KNOWN start
  // time (a booking with no start time has no self-attest window).
  const startsAtMs = toMillis(bk.starts_at as string | null)
  if (!isSelfAttestOpen(startsAtMs, Date.now())) {
    return NextResponse.json(
      { error: "not_available", reason: "Self-attest opens 30 minutes after the shift start." },
      { status: 409 }
    )
  }

  // Legality of accepted → checked_in (DB 0009 trigger is the backstop).
  try {
    assertTransition("accepted", "checked_in")
  } catch {
    return NextResponse.json({ error: "illegal_transition" }, { status: 409 })
  }

  // A supplied photo path MUST live in the medic's own Storage folder — the same
  // owner-folder invariant the bucket policy enforces (0013). Reject anything else
  // rather than record a path we don't own.
  let photoPath: string | null = null
  if (typeof body.photoPath === "string" && body.photoPath.length > 0) {
    if (!body.photoPath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "bad_photo_path" }, { status: 400 })
    }
    photoPath = body.photoPath
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, MAX_NOTE) || null : null

  const admin = createAdminClient()
  if (!admin) {
    console.error("[shifts/self-attest] SUPABASE_SERVICE_ROLE_KEY not set — cannot record")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }

  // Record the self-attest check-in event (service-role — check_ins has no client
  // write policy).
  const { error: ciErr } = await admin.from("check_ins").insert({
    booking_id: bookingId,
    actor_role: "emt",
    method: "fallback",
    phase: "check_in",
    verification_quality: "self_attested",
    latitude: numOrNull(body.latitude),
    longitude: numOrNull(body.longitude),
    accuracy_meters: numOrNull(body.accuracy),
    note,
    photo_path: photoPath,
  })
  if (ciErr) {
    console.error("[shifts/self-attest] check_ins insert failed:", ciErr.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  // Transition accepted → checked_in, guarded on the prior status so a concurrent
  // organizer verify (or a double-tap) can't double-apply. If it didn't apply,
  // someone else already advanced the shift — don't email.
  const { data: updated, error: updErr } = await admin
    .from("bookings")
    .update({ status: "checked_in" })
    .eq("id", bookingId)
    .eq("status", "accepted")
    .select("id")
  if (updErr) {
    console.error("[shifts/self-attest] booking transition failed:", updErr.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "wrong_phase", reason: "This shift already moved on — refresh." }, { status: 409 })
  }

  // Audit trail (best-effort).
  const { error: trailErr } = await admin.from("booking_state_transitions").insert({
    booking_id: bookingId,
    from_status: "accepted",
    to_status: "checked_in",
    actor_user_id: user.id,
    actor_role: "emt",
    reason: "Medic self-attested on-site check-in (30-min fallback)",
    metadata: { method: "fallback", verification_quality: "self_attested", has_photo: photoPath != null },
  })
  if (trailErr) console.error("[shifts/self-attest] audit insert failed (continuing):", trailErr.message)

  // Best-effort organizer notification. Resolve the organizer email server-side
  // with the service role AFTER the participant check above (never hand emails to
  // the caller). Gated on the transition having just applied, so it fires once.
  try {
    const [orgUser, emtProfile] = await Promise.all([
      admin.auth.admin.getUserById(bk.organizer_id),
      admin.from("profiles").select("full_name").eq("id", bk.emt_id).maybeSingle(),
    ])
    const organizerEmail = orgUser.data.user?.email
    if (organizerEmail) {
      const data: BookingEmailData = {
        eventName: bk.event_name,
        eventDate: bk.event_date,
        location: bk.location,
        durationHours: Number(bk.duration_hours) || 0,
        offeredRate: (bk.rate_cents ?? 0) / 100,
        notes: bk.notes,
      }
      const origin = process.env.SITE_URL ?? new URL(request.url).origin
      const { subject, html } = selfAttestCheckInEmail(
        data,
        emtProfile.data?.full_name || "Your medic",
        origin,
        bookingId
      )
      void sendEmail(organizerEmail, subject, html)
    }
  } catch (e) {
    console.error("[shifts/self-attest] organizer notify failed (continuing):", e)
  }

  return NextResponse.json({ ok: true, status: "checked_in" })
}
