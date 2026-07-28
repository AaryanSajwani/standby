import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { validateReviewText } from "@/lib/reviews/content-guard"
import { isValidOverall, validSubscores } from "@/lib/reviews/dimensions"

// POST { bookingId, overall, subscores, body }  →  { ok, published }
//
// Submit a two-sided review. author_role/subject are DERIVED from the caller's
// relationship to the booking (never trusted from the client). Only `completed`
// bookings are reviewable — enforced by the RLS insert policy (0010) AND
// re-checked here. Content is validated server-side (the client guard is UX, not
// a control). On submit, if the counterparty already reviewed, both publish
// immediately (double-blind reveal); otherwise the review stays `pending` until
// the counterparty submits or the cron closes the 14-day window.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { bookingId?: unknown; overall?: unknown; subscores?: unknown; body?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const bookingId = typeof body.bookingId === "string" ? body.bookingId : ""
  if (!UUID_RE.test(bookingId)) return NextResponse.json({ error: "bad_request" }, { status: 400 })

  // Relationship → author_role + subject (both derived, never client-supplied).
  const { data: bk } = await supabase
    .from("bookings")
    .select("id, organizer_id, emt_id, status")
    .eq("id", bookingId)
    .maybeSingle()
  if (!bk) return NextResponse.json({ error: "not_found" }, { status: 404 })

  let authorRole: "organizer" | "emt"
  let subjectUserId: string
  if (bk.emt_id === user.id) {
    authorRole = "emt"
    subjectUserId = bk.organizer_id
  } else if (bk.organizer_id === user.id) {
    authorRole = "organizer"
    subjectUserId = bk.emt_id
  } else {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  if (bk.status !== "completed") {
    return NextResponse.json({ error: "not_reviewable", reason: "Only completed shifts can be reviewed." }, { status: 409 })
  }

  const overall = body.overall
  const subscores = (body.subscores ?? {}) as Record<string, unknown>
  const text = typeof body.body === "string" ? body.body : ""
  if (!isValidOverall(overall) || !validSubscores(authorRole, subscores)) {
    return NextResponse.json({ error: "invalid_ratings", reason: "Rate every category from 1 to 5." }, { status: 400 })
  }
  // Server-side content enforcement (email/phone/off-platform/length are hard
  // errors; PHI is a warning the client surfaces, not a block).
  const check = validateReviewText(text, authorRole)
  if (!check.ok) {
    return NextResponse.json({ error: "content_rejected", errors: check.errors }, { status: 400 })
  }

  // Insert under the caller's RLS — the "reviews author insert" policy (0010)
  // structurally enforces completed booking + participant + author_role/subject
  // consistency + status='pending'. Belt-and-suspenders with the checks above.
  const { error: insErr } = await supabase.from("reviews").insert({
    booking_id: bookingId,
    author_user_id: user.id,
    subject_user_id: subjectUserId,
    author_role: authorRole,
    overall,
    subscores,
    body: text.trim() || null,
    status: "pending",
  })
  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ error: "already_reviewed", reason: "You already reviewed this shift." }, { status: 409 })
    }
    console.error("[reviews] insert failed:", insErr.message)
    return NextResponse.json({ error: "insert_failed", reason: insErr.message }, { status: 400 })
  }

  // Double-blind reveal: if BOTH parties have now submitted, publish the pair
  // immediately (service-role — clients can never self-publish). Best-effort; the
  // cron is the backstop that also closes the 14-day single-sided window.
  let published = false
  const admin = createAdminClient()
  if (admin) {
    const { data: all } = await admin
      .from("reviews")
      .select("id, status")
      .eq("booking_id", bookingId)
    const rows = all ?? []
    if (rows.length >= 2) {
      const toPublish = rows.filter((r) => r.status === "pending").map((r) => r.id)
      if (toPublish.length > 0) {
        const { error: pubErr } = await admin
          .from("reviews")
          .update({ status: "published", published_at: new Date().toISOString() })
          .in("id", toPublish)
        if (pubErr) console.error("[reviews] eager publish failed (cron will retry):", pubErr.message)
        else published = true
      }
    }
  }

  return NextResponse.json({ ok: true, published })
}
