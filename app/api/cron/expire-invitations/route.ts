import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/cron/expire-invitations
//
// Returns every HELD slot whose invitation has lapsed back to `open` so it stops
// freezing inbound supply (staffing-slots: a non-responsive invitee must not hang
// the slot until the event date). Service-role only; the state change is the
// source of truth, audit + notifications are best-effort.
//
// Protected by CRON_SECRET (Vercel Cron sends `Authorization: Bearer <secret>`;
// see vercel.json). Unset ⇒ 503 — an unregistered/misconfigured cron must fail
// loudly rather than silently leaving slots held (staffing-slots dependency note).

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("[cron/expire-invitations] CRON_SECRET not set — refusing to run")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    console.error("[cron/expire-invitations] SUPABASE_SERVICE_ROLE_KEY not set")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }

  const nowIso = new Date().toISOString()

  // One guarded batch update: only rows still `invited` and past their deadline.
  // Returns the reopened rows so we can write their audit trail.
  const { data: reopened, error } = await admin
    .from("bookings")
    .update({ status: "open", invited_emt_id: null, invited_at: null, invitation_expires_at: null })
    .eq("status", "invited")
    .lt("invitation_expires_at", nowIso)
    .select("id")
  if (error) {
    console.error("[cron/expire-invitations] update failed:", error.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  const ids = (reopened ?? []).map((r) => r.id)
  if (ids.length === 0) return NextResponse.json({ expired: 0 })

  // Audit rows (system actor). Best-effort — the reopen above is the truth.
  const { error: auditErr } = await admin.from("booking_state_transitions").insert(
    ids.map((id) => ({
      booking_id: id,
      from_status: "invited",
      to_status: "open",
      actor_user_id: null,
      actor_role: "system",
      reason: "Invitation expired; slot reopened",
    }))
  )
  if (auditErr) console.error("[cron/expire-invitations] audit insert failed (continuing):", auditErr.message)

  return NextResponse.json({ expired: ids.length })
}
