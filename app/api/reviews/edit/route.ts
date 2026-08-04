import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { validateReviewText } from "@/lib/reviews/content-guard"
import { isValidOverall, validSubscores } from "@/lib/reviews/dimensions"

// POST { reviewId, overall, subscores, body }  →  { ok }
//
// An author edits their OWN review. Editable while pending, and for 24h after
// publication — after that the DB guard (0010) locks it. Only {overall,
// subscores, body} may change; identity/lifecycle columns are immutable (guard).
// Content is re-validated server-side (the client guard is UX, not a control),
// and each edit appends a review_revisions row (service-role — revisions have no
// client insert policy). author_role is read from the row, never trusted from the
// client.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { reviewId?: unknown; overall?: unknown; subscores?: unknown; body?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const reviewId = typeof body.reviewId === "string" ? body.reviewId : ""
  if (!UUID_RE.test(reviewId)) return NextResponse.json({ error: "bad_request" }, { status: 400 })

  // Read the review (RLS: authors read their own regardless of status).
  const { data: rv } = await supabase
    .from("reviews")
    .select("id, author_user_id, author_role, status, published_at")
    .eq("id", reviewId)
    .maybeSingle()
  if (!rv) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (rv.author_user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const authorRole = rv.author_role as "organizer" | "emt"

  // Friendly pre-check of the 24h lock (the DB guard is the real enforcement).
  if (rv.status === "published" && rv.published_at) {
    const publishedMs = Date.parse(rv.published_at)
    if (Number.isFinite(publishedMs) && Date.now() > publishedMs + EDIT_WINDOW_MS) {
      return NextResponse.json(
        { error: "locked", reason: "This review is locked — edits close 24 hours after it publishes." },
        { status: 409 }
      )
    }
  }

  const overall = body.overall
  const subscores = (body.subscores ?? {}) as Record<string, unknown>
  const text = typeof body.body === "string" ? body.body : ""
  if (!isValidOverall(overall) || !validSubscores(authorRole, subscores)) {
    return NextResponse.json({ error: "invalid_ratings", reason: "Rate every category from 1 to 5." }, { status: 400 })
  }
  const check = validateReviewText(text, authorRole)
  if (!check.ok) {
    return NextResponse.json({ error: "content_rejected", errors: check.errors }, { status: 400 })
  }
  const trimmed = text.trim() || null

  // Update under the caller's RLS. The guard trigger re-pins the immutable columns
  // and enforces the 24h lock; a check_violation means locked/disallowed.
  const { data: updated, error: updErr } = await supabase
    .from("reviews")
    .update({ overall, subscores, body: trimmed })
    .eq("id", reviewId)
    .eq("author_user_id", user.id)
    .select("id")
  if (updErr) {
    if (updErr.code === "23514" || /check_violation|locked/i.test(updErr.message)) {
      return NextResponse.json({ error: "locked", reason: "This review can no longer be edited." }, { status: 409 })
    }
    console.error("[reviews/edit] update failed:", updErr.message)
    return NextResponse.json({ error: "update_failed" }, { status: 400 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  // Append an edit-history row (service-role — review_revisions is author-read,
  // service-write). Best-effort: the edit already applied.
  const admin = createAdminClient()
  if (admin) {
    const { error: revErr } = await admin.from("review_revisions").insert({
      review_id: reviewId,
      overall,
      subscores,
      body: trimmed,
    })
    if (revErr) console.error("[reviews/edit] revision insert failed (continuing):", revErr.message)
  }

  return NextResponse.json({ ok: true })
}
