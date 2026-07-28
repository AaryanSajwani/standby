import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyCode } from "@/lib/shifts/verification-code"
import { assertTransition } from "@/lib/bookings/state-machine"
import { rateLimit } from "@/lib/rate-limit"

// POST { bookingId, code, phase: "check_in" | "check_out", latitude?, longitude?, accuracy? }
//
// The organizer verifies the medic's rotating code on site. On success we write a
// check_ins row and transition the booking (accepted → checked_in, or
// checked_in → completed). Geolocation is best-effort — captured if the browser
// grants it, never required.
//
// BRUTE-FORCE CAP (required by lib/shifts/verification-code.ts): the code space
// is 10^6 over a ~120s acceptance window, so this endpoint caps attempts per
// (booking, organizer) in addition to the app-layer /api rate tier.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PHASES = ["check_in", "check_out"] as const
type Phase = (typeof PHASES)[number]

// A submitted code is accepted across ~2 windows; cap wrong tries well below the
// brute-force reach in that window.
const VERIFY_LIMIT = 6
const VERIFY_WINDOW_MS = 60_000

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { bookingId?: unknown; code?: unknown; phase?: unknown; latitude?: unknown; longitude?: unknown; accuracy?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const bookingId = typeof body.bookingId === "string" ? body.bookingId : ""
  const code = typeof body.code === "string" ? body.code : ""
  const phase = body.phase as Phase
  if (!UUID_RE.test(bookingId) || !PHASES.includes(phase)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }

  // Per-(booking, organizer) attempt cap — must run before the secret lookup so a
  // flood can't grind the code space.
  const verdict = rateLimit(`shift-verify:${bookingId}:${user.id}`, VERIFY_LIMIT, VERIFY_WINDOW_MS)
  if (!verdict.ok) {
    return NextResponse.json(
      { error: "too_many_attempts", retryAfterSec: verdict.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfterSec) } }
    )
  }

  // Load under RLS (organizer_select_own → only the slot's organizer sees it).
  const { data: bk } = await supabase
    .from("bookings")
    .select("id, organizer_id, emt_id, status")
    .eq("id", bookingId)
    .maybeSingle()
  if (!bk) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (bk.organizer_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const from = phase === "check_in" ? "accepted" : "checked_in"
  const to = phase === "check_in" ? "checked_in" : "completed"
  if (bk.status !== from) {
    return NextResponse.json(
      { error: "wrong_phase", reason: phase === "check_in" ? "This shift isn't ready to check in." : "Check the medic in first." },
      { status: 409 }
    )
  }
  // Legality of the booking transition (DB 0009 trigger is the backstop).
  try {
    assertTransition(from, to)
  } catch {
    return NextResponse.json({ error: "illegal_transition" }, { status: 409 })
  }

  const admin = createAdminClient()
  if (!admin) {
    console.error("[shifts/verify] SUPABASE_SERVICE_ROLE_KEY not set — cannot verify")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }

  const { data: secretRow } = await admin
    .from("shift_verification_secrets")
    .select("secret")
    .eq("booking_id", bookingId)
    .maybeSingle()
  if (!secretRow?.secret) {
    // No secret yet ⇒ the medic hasn't opened their code screen.
    return NextResponse.json({ error: "no_code_yet", reason: "Ask the medic to open their check-in code first." }, { status: 409 })
  }

  if (!verifyCode(secretRow.secret, code)) {
    return NextResponse.json({ error: "invalid_code", reason: "That code is wrong or expired. Ask for the current one." }, { status: 400 })
  }

  // Write the check-in event (service-role — check_ins has no client write policy).
  const { error: ciErr } = await admin.from("check_ins").insert({
    booking_id: bookingId,
    actor_role: "organizer",
    method: "manual",
    phase,
    verification_quality: "verified",
    latitude: numOrNull(body.latitude),
    longitude: numOrNull(body.longitude),
    accuracy_meters: numOrNull(body.accuracy),
  })
  if (ciErr) {
    console.error("[shifts/verify] check_ins insert failed:", ciErr.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  // Transition the booking, guarded on the expected prior status so a concurrent
  // verify can't double-apply.
  const { data: updated, error: updErr } = await admin
    .from("bookings")
    .update({ status: to })
    .eq("id", bookingId)
    .eq("status", from)
    .select("id")
  if (updErr) {
    console.error("[shifts/verify] booking transition failed:", updErr.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "wrong_phase", reason: "This shift already moved on — refresh." }, { status: 409 })
  }

  // Audit trail (best-effort).
  const { error: trailErr } = await admin.from("booking_state_transitions").insert({
    booking_id: bookingId,
    from_status: from,
    to_status: to,
    actor_user_id: user.id,
    actor_role: "organizer",
    reason: phase === "check_in" ? "Organizer verified medic on-site check-in" : "Organizer verified shift check-out",
  })
  if (trailErr) console.error("[shifts/verify] audit insert failed (continuing):", trailErr.message)

  return NextResponse.json({ ok: true, status: to })
}
