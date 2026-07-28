import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/cron/publish-reviews
//
// Publishes due reviews (double-blind reveal):
//   • both parties on a booking have submitted → publish the pair, OR
//   • the 14-day window since submission has closed → publish the single side.
// The eager path in POST /api/reviews handles the common "both submitted" case
// instantly; this cron is the backstop and the sole mechanism for the 14-day
// close. Publication is service-role only (clients can never self-publish).
//
// Protected by CRON_SECRET: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
// when the env var is set (see vercel.json). Unset ⇒ 503 (refuse to run open).

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("[cron/publish-reviews] CRON_SECRET not set — refusing to run")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    console.error("[cron/publish-reviews] SUPABASE_SERVICE_ROLE_KEY not set")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }

  // Pull everything needed to decide, in two small reads.
  const { data: all, error } = await admin
    .from("reviews")
    .select("id, booking_id, status, submitted_at")
  if (error) {
    console.error("[cron/publish-reviews] read failed:", error.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  const rows = all ?? []

  const countByBooking = new Map<string, number>()
  for (const r of rows) {
    countByBooking.set(r.booking_id, (countByBooking.get(r.booking_id) ?? 0) + 1)
  }

  const now = Date.now()
  const dueIds = rows
    .filter((r) => r.status === "pending")
    .filter((r) => {
      const bothSubmitted = (countByBooking.get(r.booking_id) ?? 0) >= 2
      const submitted = r.submitted_at ? Date.parse(r.submitted_at) : NaN
      const windowClosed = Number.isFinite(submitted) && now - submitted >= FOURTEEN_DAYS_MS
      return bothSubmitted || windowClosed
    })
    .map((r) => r.id)

  if (dueIds.length === 0) return NextResponse.json({ published: 0 })

  const { error: pubErr } = await admin
    .from("reviews")
    .update({ status: "published", published_at: new Date().toISOString() })
    .in("id", dueIds)
  if (pubErr) {
    console.error("[cron/publish-reviews] publish failed:", pubErr.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  return NextResponse.json({ published: dueIds.length })
}
