import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { ModerationActions } from "./moderation-actions"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Review moderation — Standby", robots: { index: false, follow: false } }

const REASON_LABEL: Record<string, string> = {
  phi: "Patient information",
  contact_info: "Contact info / off-platform",
  harassment: "Harassment",
  inaccurate: "Inaccurate",
  spam: "Spam",
  other: "Other",
}

interface ReportRow {
  id: string
  review_id: string
  reason: string
  description: string | null
  status: string
  created_at: string
}
interface ReviewRow {
  id: string
  body: string | null
  overall: number
  author_role: string
  subject_user_id: string
  status: string
}

export default async function AdminReviewsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth?next=/admin/reviews")
  // Not an admin ⇒ behave as if the page doesn't exist (proxy also guards this).
  if (!isAdminEmail(user.email)) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <span className="text-xs font-mono text-primary uppercase tracking-widest">404</span>
          <p className="text-muted-foreground text-sm">Not found.</p>
        </div>
      </div>
    )
  }

  const admin = createAdminClient()
  const configured = !!admin

  // Open reports + the reviews they point at (service role — moderation reads
  // across users). Show newest first.
  const { data: reportRows } = admin
    ? await admin
        .from("review_reports")
        .select("id, review_id, reason, description, status, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
    : { data: [] as ReportRow[] }
  const reports = (reportRows as ReportRow[] | null) ?? []

  const reviewIds = [...new Set(reports.map((r) => r.review_id))]
  const reviewById = new Map<string, ReviewRow>()
  if (admin && reviewIds.length) {
    const { data: reviewRows } = await admin
      .from("reviews")
      .select("id, body, overall, author_role, subject_user_id, status")
      .in("id", reviewIds)
    for (const rv of (reviewRows as ReviewRow[] | null) ?? []) reviewById.set(rv.id, rv)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Admin</span>
          <h1 className="text-foreground text-2xl md:text-3xl font-semibold leading-tight">Review moderation</h1>
          <p className="text-muted-foreground text-sm">
            Open reports on published reviews. Removing a review soft-hides it everywhere (it is never hard-deleted).
          </p>
        </div>

        {!configured && (
          <div className="border border-risk-medium/30 bg-risk-medium/5 px-4 py-3">
            <p className="font-mono text-xs text-risk-medium">
              SUPABASE_SERVICE_ROLE_KEY is not set — moderation is read-only/disabled.
            </p>
          </div>
        )}

        {reports.length === 0 ? (
          <div className="border border-border bg-card px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">No open reports.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-px">
            {reports.map((rep) => {
              const rv = reviewById.get(rep.review_id)
              const removed = rv?.status === "removed" || rv?.status === "under_review"
              return (
                <div key={rep.id} className="border border-border bg-card px-5 py-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-mono text-[10px] uppercase tracking-widest border border-primary/30 bg-primary/5 text-primary px-2 py-0.5">
                      {REASON_LABEL[rep.reason] ?? rep.reason}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {new Date(rep.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  {rep.description && <p className="text-sm text-muted-foreground leading-relaxed">Reporter note: {rep.description}</p>}
                  <div className="border-l-2 border-border pl-3 flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Reviewed content · {rv?.author_role === "organizer" ? "organizer → medic" : "medic → organizer"} · {rv ? `${rv.overall}/5` : "—"}
                      {removed && <span className="text-destructive"> · removed</span>}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">{rv?.body || <span className="text-muted-foreground italic">No text.</span>}</p>
                  </div>
                  {configured && rv && <ModerationActions reportId={rep.id} removed={!!removed} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
