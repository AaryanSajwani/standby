import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateReviewText } from "@/lib/reviews/content-guard"

// POST { reviewId, body }  →  { ok, mode: "created" | "edited" }
//
// The SUBJECT of a published review posts (or edits) their one reply. RLS (0010)
// structurally enforces "subject of a published review" on insert and "own reply"
// on update; the guard trigger keeps review_id/author immutable. Content is
// re-validated server-side. The replier's role is the OPPOSITE of the review's
// author_role (the reviewer rated the subject), which drives the PHI check — a
// medic replying to an organizer's review must not describe patient care.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_REPLY = 1000

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { reviewId?: unknown; body?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const reviewId = typeof body.reviewId === "string" ? body.reviewId : ""
  const text = typeof body.body === "string" ? body.body : ""
  if (!UUID_RE.test(reviewId)) return NextResponse.json({ error: "bad_request" }, { status: 400 })
  if (!text.trim()) return NextResponse.json({ error: "empty", reason: "Write a reply first." }, { status: 400 })
  if (text.length > MAX_REPLY) {
    return NextResponse.json({ error: "too_long", reason: `Keep it under ${MAX_REPLY} characters.` }, { status: 400 })
  }

  // Read the review (RLS: published reviews are public). Must be published, and
  // the caller must be its subject.
  const { data: rv } = await supabase
    .from("reviews")
    .select("id, author_role, subject_user_id, status")
    .eq("id", reviewId)
    .maybeSingle()
  if (!rv) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (rv.status !== "published") {
    return NextResponse.json({ error: "not_repliable", reason: "You can only reply once the review is published." }, { status: 409 })
  }
  if (rv.subject_user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  // Replier = subject, whose role is the opposite of the reviewer's.
  const replierRole: "organizer" | "emt" = rv.author_role === "organizer" ? "emt" : "organizer"
  const check = validateReviewText(text, replierRole)
  if (!check.ok) {
    return NextResponse.json({ error: "content_rejected", errors: check.errors }, { status: 400 })
  }
  const trimmed = text.trim()

  // Create the reply; if one already exists (unique review_id), edit it instead.
  // Both run under the caller's RLS — the insert policy enforces subject+published,
  // the update policy + guard enforce own-reply + immutable review_id/author.
  const { error: insErr } = await supabase.from("review_replies").insert({
    review_id: reviewId,
    author_user_id: user.id,
    body: trimmed,
  })
  if (!insErr) return NextResponse.json({ ok: true, mode: "created" })

  if (insErr.code === "23505") {
    const { error: updErr } = await supabase
      .from("review_replies")
      .update({ body: trimmed })
      .eq("review_id", reviewId)
      .eq("author_user_id", user.id)
    if (updErr) {
      console.error("[reviews/reply] update failed:", updErr.message)
      return NextResponse.json({ error: "update_failed" }, { status: 400 })
    }
    return NextResponse.json({ ok: true, mode: "edited" })
  }

  console.error("[reviews/reply] insert failed:", insErr.message)
  return NextResponse.json({ error: "insert_failed", reason: insErr.message }, { status: 400 })
}
