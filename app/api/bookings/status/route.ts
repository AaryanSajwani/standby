import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertTransition, type BookingState } from "@/lib/bookings/state-machine"

// POST { bookingId, action }  →  { ok, status }
//
// The guarded action behind the negative terminal outcomes: an organizer marks a
// medic no-show or cancels a slot, or a medic cancels their own accepted shift.
// These feed the reliability signal (emt_reliability_stats), so they must be
// authorized precisely and legal per the state machine (the 0009 DB trigger is
// the backstop). The organizer has NO client UPDATE grant on bookings (only the
// assigned medic may client-update `status`), so every path here runs SERVER-SIDE
// with the service role AFTER we authorize the caller as the right participant.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// action → { who may do it, legal prior statuses }.
const ACTIONS = {
  no_show_emt:         { role: "organizer", from: ["accepted", "confirmed"] },
  cancelled_organizer: { role: "organizer", from: ["open", "draft", "pending", "accepted", "confirmed"] },
  cancelled_emt:       { role: "emt",       from: ["accepted", "confirmed"] },
} as const
type Action = keyof typeof ACTIONS

const REASON: Record<Action, string> = {
  no_show_emt: "Organizer marked the medic a no-show",
  cancelled_organizer: "Organizer cancelled the shift",
  cancelled_emt: "Medic cancelled the shift",
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { bookingId?: unknown; action?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const bookingId = typeof body.bookingId === "string" ? body.bookingId : ""
  const action = body.action as Action
  if (!UUID_RE.test(bookingId) || !(action in ACTIONS)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const spec = ACTIONS[action]

  // Load under RLS (participant-only) and derive the caller's role.
  const { data: bk } = await supabase
    .from("bookings")
    .select("id, organizer_id, emt_id, status")
    .eq("id", bookingId)
    .maybeSingle()
  if (!bk) return NextResponse.json({ error: "not_found" }, { status: 404 })
  const callerRole: "organizer" | "emt" | null =
    bk.organizer_id === user.id ? "organizer" : bk.emt_id === user.id ? "emt" : null
  if (!callerRole) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  if (callerRole !== spec.role) {
    return NextResponse.json({ error: "forbidden", reason: "You can't perform that action on this shift." }, { status: 403 })
  }

  const from = bk.status as string
  if (!(spec.from as readonly string[]).includes(from)) {
    return NextResponse.json(
      { error: "wrong_phase", reason: `This shift can't be marked ${action.replace(/_/g, " ")} from its current state.` },
      { status: 409 }
    )
  }

  // Legal per the state machine (actor-constrained); the DB trigger re-checks.
  try {
    assertTransition(from as BookingState, action, callerRole)
  } catch {
    return NextResponse.json({ error: "illegal_transition" }, { status: 409 })
  }

  const admin = createAdminClient()
  if (!admin) {
    console.error("[bookings/status] SUPABASE_SERVICE_ROLE_KEY not set — cannot apply")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }

  // Guarded on the prior status so a concurrent transition can't double-apply.
  const { data: updated, error: updErr } = await admin
    .from("bookings")
    .update({ status: action })
    .eq("id", bookingId)
    .eq("status", from)
    .select("id")
  if (updErr) {
    console.error("[bookings/status] update failed:", updErr.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "wrong_phase", reason: "This shift already moved on — refresh." }, { status: 409 })
  }

  // Audit trail (best-effort).
  const { error: trailErr } = await admin.from("booking_state_transitions").insert({
    booking_id: bookingId,
    from_status: from,
    to_status: action,
    actor_user_id: user.id,
    actor_role: callerRole,
    reason: REASON[action],
  })
  if (trailErr) console.error("[bookings/status] audit insert failed (continuing):", trailErr.message)

  return NextResponse.json({ ok: true, status: action })
}
