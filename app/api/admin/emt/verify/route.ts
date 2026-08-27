import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { emtVerificationRejectedEmail, sendEmail } from "@/lib/notifications"

// POST { emtProfileId, action: "accept" | "reject", notify?: boolean, reason?: string }
//
// ADMIN-ONLY EMT credential decision. `verified` is the load-bearing gate the
// marketplace + RLS key on and is client-immutable, so ALL writes here go through
// the SERVICE ROLE (bypasses RLS + the column grants that block clients):
//
//   accept → verified=true,  verification_status='accepted'
//   reject → verified=false, verification_status='rejected'
//     · plain reject: no email (bots / obvious non-EMTs)
//     · reject + notify: store the reason and email it to the applicant
//   revoke → the same "reject" applied to an already-accepted profile
//
// Admin identity is the ADMIN_EMAILS allowlist (lib/admin.ts), checked here AND
// in proxy.ts. The applicant's email is resolved server-side with the service
// role and never returned to the caller.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_REASON = 2000

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  let body: { emtProfileId?: unknown; action?: unknown; notify?: unknown; reason?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const emtProfileId = typeof body.emtProfileId === "string" ? body.emtProfileId : ""
  const action = body.action === "accept" || body.action === "reject" ? body.action : ""
  const notify = body.notify === true
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, MAX_REASON) : ""
  if (!UUID_RE.test(emtProfileId) || !action) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  // "Reject and send email" needs a reason — that's the whole point of the variant.
  if (action === "reject" && notify && !reason) {
    return NextResponse.json({ error: "reason_required", reason: "Enter a reason to send the applicant an email." }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    console.error("[admin/emt/verify] SUPABASE_SERVICE_ROLE_KEY not set")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }

  const { data: profile } = await admin
    .from("emt_profiles")
    .select("id, user_id, verification_status")
    .eq("id", emtProfileId)
    .maybeSingle()
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 })

  const nowIso = new Date().toISOString()

  if (action === "accept") {
    const { error } = await admin
      .from("emt_profiles")
      .update({
        verified: true,
        verification_status: "accepted",
        rejection_reason: null,
        reviewed_at: nowIso,
        reviewed_by: user.id,
      })
      .eq("id", emtProfileId)
    if (error) {
      console.error("[admin/emt/verify] accept failed:", error.message)
      return NextResponse.json({ error: "server_error" }, { status: 500 })
    }
    return NextResponse.json({ ok: true, status: "accepted" })
  }

  // reject (also the "revoke access" path from an accepted profile)
  const { error } = await admin
    .from("emt_profiles")
    .update({
      verified: false,
      verification_status: "rejected",
      rejection_reason: notify ? reason : null,
      reviewed_at: nowIso,
      reviewed_by: user.id,
    })
    .eq("id", emtProfileId)
  if (error) {
    console.error("[admin/emt/verify] reject failed:", error.message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  let emailed = false
  if (notify && reason) {
    // Resolve the applicant's email + name server-side (never exposed to the
    // caller). Best-effort: a missing Resend key / unverified domain logs + skips.
    try {
      const [{ data: authUser }, { data: prof }] = await Promise.all([
        admin.auth.admin.getUserById(profile.user_id),
        admin.from("profiles").select("full_name").eq("id", profile.user_id).maybeSingle(),
      ])
      const email = authUser?.user?.email
      if (email) {
        const origin = process.env.SITE_URL ?? new URL(request.url).origin
        const { subject, html } = emtVerificationRejectedEmail(prof?.full_name ?? null, reason, origin)
        emailed = await sendEmail(email, subject, html)
      }
    } catch (e) {
      console.error("[admin/emt/verify] rejection email failed (continuing):", e)
    }
  }

  return NextResponse.json({ ok: true, status: "rejected", emailed })
}
