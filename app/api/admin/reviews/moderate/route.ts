import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"

// POST { reportId, action: "dismiss" | "remove" | "restore" }  →  { ok }
//
// ADMIN-ONLY moderation. Soft-hide only — reviews are never hard-deleted; the
// review's `status` flips (published → removed, or restored → published) via the
// SERVICE ROLE (which bypasses RLS AND the client-update guard, whose 24h lock /
// immutability rules apply only to clients). Admin identity is the ADMIN_EMAILS
// allowlist (lib/admin.ts), checked here and in proxy.ts.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ACTIONS = ["dismiss", "remove", "restore"] as const
type Action = (typeof ACTIONS)[number]

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  let body: { reportId?: unknown; action?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const reportId = typeof body.reportId === "string" ? body.reportId : ""
  const action = body.action as Action
  if (!UUID_RE.test(reportId) || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    console.error("[admin/moderate] SUPABASE_SERVICE_ROLE_KEY not set")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }

  const { data: report } = await admin
    .from("review_reports")
    .select("id, review_id, status")
    .eq("id", reportId)
    .maybeSingle()
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 })

  if (action === "dismiss") {
    await admin.from("review_reports").update({ status: "dismissed" }).eq("id", reportId)
    return NextResponse.json({ ok: true, status: "dismissed" })
  }

  if (action === "remove") {
    const { error: rvErr } = await admin.from("reviews").update({ status: "removed" }).eq("id", report.review_id)
    if (rvErr) {
      console.error("[admin/moderate] review remove failed:", rvErr.message)
      return NextResponse.json({ error: "server_error" }, { status: 500 })
    }
    // Close every open report on this review, not just the one clicked.
    await admin.from("review_reports").update({ status: "actioned" }).eq("review_id", report.review_id).eq("status", "open")
    return NextResponse.json({ ok: true, status: "removed" })
  }

  // restore: bring a removed/under_review review back to published.
  const { error: rvErr } = await admin.from("reviews").update({ status: "published" }).eq("id", report.review_id)
  if (rvErr) {
    console.error("[admin/moderate] review restore failed:", rvErr.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  await admin.from("review_reports").update({ status: "dismissed" }).eq("id", reportId)
  return NextResponse.json({ ok: true, status: "restored" })
}
