import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST { reviewId, reason, description? }  →  { ok }
//
// Any signed-in user flags a published review for moderator attention. Inserts a
// review_reports row under the caller's RLS (the reporter_insert policy pins
// reporter_user_id = auth.uid()). Moderation itself (soft-hide) is a separate,
// admin-only, service-role action (/api/admin/reviews/moderate) — reporting never
// hides anything on its own.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const REASONS = ["phi", "contact_info", "harassment", "inaccurate", "spam", "other"] as const
type Reason = (typeof REASONS)[number]
const MAX_DESC = 1000

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { reviewId?: unknown; reason?: unknown; description?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const reviewId = typeof body.reviewId === "string" ? body.reviewId : ""
  const reason = body.reason as Reason
  if (!UUID_RE.test(reviewId) || !REASONS.includes(reason)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, MAX_DESC) || null : null

  // Only published reviews are reportable (a hidden/removed one shouldn't be
  // re-flagged). Published reviews are readable under RLS.
  const { data: rv } = await supabase
    .from("reviews")
    .select("id, status")
    .eq("id", reviewId)
    .maybeSingle()
  if (!rv || rv.status !== "published") {
    return NextResponse.json({ error: "not_reportable" }, { status: 409 })
  }

  const { error: insErr } = await supabase.from("review_reports").insert({
    review_id: reviewId,
    reporter_user_id: user.id,
    reason,
    description,
  })
  if (insErr) {
    console.error("[reviews/report] insert failed:", insErr.message)
    return NextResponse.json({ error: "insert_failed" }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
