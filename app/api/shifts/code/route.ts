import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { currentCode, generateSecret } from "@/lib/shifts/verification-code"

// POST { bookingId }  →  { code, secondsRemaining, expiresAt }
//
// The rotating check-in code lives on the MEDIC's device (build-prompts: the
// medic shows it, the organizer verifies — proving physical co-presence). Only
// the assigned medic of an accepted/checked_in booking may fetch it. The
// per-booking secret is created lazily here and lives ONLY in
// shift_verification_secrets (service-role); it never leaves the server — we
// return just the current code + expiry.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { bookingId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const bookingId = typeof body.bookingId === "string" ? body.bookingId : ""
  if (!UUID_RE.test(bookingId)) return NextResponse.json({ error: "bad_request" }, { status: 400 })

  // Load under RLS (emt_select_assigned → only the assigned medic sees it).
  const { data: bk } = await supabase
    .from("bookings")
    .select("id, emt_id, status")
    .eq("id", bookingId)
    .maybeSingle()
  if (!bk) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (bk.emt_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  // Code is only meaningful while the shift is live: accepted → check in,
  // checked_in → check out.
  if (bk.status !== "accepted" && bk.status !== "checked_in") {
    return NextResponse.json({ error: "not_active", reason: "This shift is not checking in right now." }, { status: 409 })
  }

  const admin = createAdminClient()
  if (!admin) {
    console.error("[shifts/code] SUPABASE_SERVICE_ROLE_KEY not set — cannot issue code")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }

  // Get-or-create the per-booking secret. ignoreDuplicates → never overwrite an
  // existing secret (which would invalidate a code the organizer is mid-typing).
  await admin
    .from("shift_verification_secrets")
    .upsert({ booking_id: bookingId, secret: generateSecret() }, { onConflict: "booking_id", ignoreDuplicates: true })

  const { data: secretRow, error: secretErr } = await admin
    .from("shift_verification_secrets")
    .select("secret")
    .eq("booking_id", bookingId)
    .maybeSingle()
  if (secretErr || !secretRow?.secret) {
    console.error("[shifts/code] secret lookup failed:", secretErr?.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  const { code, secondsRemaining, expiresAt } = currentCode(secretRow.secret)
  return NextResponse.json({ code, secondsRemaining, expiresAt })
}
