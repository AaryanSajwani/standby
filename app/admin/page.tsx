import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ShieldAlert, Flag, Users, CalendarDays, ClipboardList } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Admin — Standby", robots: { index: false, follow: false } }

// Count helper — head-only exact count, or null if the query errors / no client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countOf(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  build?: (q: any) => any // untyped Supabase client — the query builder is any
): Promise<number | null> {
  if (!admin) return null
  let q = admin.from(table).select("*", { count: "exact", head: true })
  if (build) q = build(q)
  const { count, error } = await q
  return error ? null : count ?? 0
}

export default async function AdminHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth?next=/admin")
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

  // Real platform counts (service role — admin reads across all users). No
  // fabricated numbers: every figure is a live COUNT, or "—" when unavailable.
  const [openReports, publishedReviews, verifiedEmts, pendingEmts, events, bookings] = await Promise.all([
    countOf(admin, "review_reports", (q) => q.eq("status", "open")),
    countOf(admin, "reviews", (q) => q.eq("status", "published")),
    countOf(admin, "emt_profiles", (q) => q.eq("verified", true)),
    countOf(admin, "emt_profiles", (q) => q.eq("verification_status", "pending")),
    countOf(admin, "events"),
    countOf(admin, "bookings"),
  ])

  const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString())

  const stats = [
    { label: "Open review reports", value: openReports, icon: Flag, accent: (openReports ?? 0) > 0 },
    { label: "Published reviews", value: publishedReviews, icon: ClipboardList },
    { label: "Verified EMTs", value: verifiedEmts, icon: Users },
    { label: "Awaiting verification", value: pendingEmts, icon: ShieldAlert, accent: (pendingEmts ?? 0) > 0 },
    { label: "Events", value: events, icon: CalendarDays },
    { label: "Bookings", value: bookings, icon: ClipboardList },
  ]

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-8">
        {/* Header + system status (the indicator that used to sit in every user's nav) */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Admin</span>
            <h1 className="text-foreground text-2xl md:text-3xl font-semibold leading-tight">Control room</h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Signed in as <span className="font-mono text-foreground">{user.email}</span>. Restricted to the Standby admin allowlist.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-risk-low animate-standby-pulse" />
              <span className="text-xs font-mono text-muted-foreground tracking-wider">System Online</span>
            </div>
            <span className={`font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 ${configured ? "border-risk-low/30 text-risk-low" : "border-risk-medium/30 text-risk-medium"}`}>
              {configured ? "Service role: connected" : "Service role: not set"}
            </span>
          </div>
        </div>

        {!configured && (
          <div className="border border-risk-medium/30 bg-risk-medium/5 px-4 py-3">
            <p className="font-mono text-xs text-risk-medium">
              SUPABASE_SERVICE_ROLE_KEY is not set — counts and moderation are unavailable.
            </p>
          </div>
        )}

        {/* Live platform counts */}
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border border border-border">
            {stats.map(({ label, value, icon: Icon, accent }) => (
              <div key={label} className="bg-card px-5 py-4 flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
                <span className={`font-mono text-2xl tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>
                  {fmt(value)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Admin sections — every card links to a real route (no stubs). */}
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Tools</h2>
          <div className="border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-start gap-3 min-w-0">
              <Flag className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-foreground font-medium leading-tight">Review moderation</span>
                <span className="text-muted-foreground text-xs max-w-md">
                  Open reports on published reviews. Removing a review soft-hides it everywhere — never hard-deleted.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {(openReports ?? 0) > 0 && (
                <span className="font-mono text-[10px] uppercase tracking-widest border border-primary/30 bg-primary/5 text-primary px-2 py-0.5 tabular-nums">
                  {openReports} open
                </span>
              )}
              <Link
                href="/admin/reviews"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none font-mono text-[10px] uppercase tracking-wider")}
              >
                Open moderation
              </Link>
            </div>
          </div>

          <div className="border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-start gap-3 min-w-0">
              <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-foreground font-medium leading-tight">EMT verification</span>
                <span className="text-muted-foreground text-xs max-w-md">
                  Review submitted credentials, then approve (grants EMT access) or reject. Rejecting can send the applicant a templated email with a reason.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {(pendingEmts ?? 0) > 0 && (
                <span className="font-mono text-[10px] uppercase tracking-widest border border-primary/30 bg-primary/5 text-primary px-2 py-0.5 tabular-nums">
                  {pendingEmts} awaiting
                </span>
              )}
              <Link
                href="/admin/verifications"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none font-mono text-[10px] uppercase tracking-wider")}
              >
                Review credentials
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
