import { cache } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Star, Building2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { ratingDisplay } from "@/lib/reviews/reliability"
import { ReportReviewButton } from "@/components/reviews/ReportReviewButton"

// Public reputation for an ORGANIZER (the buyer side), so a medic can vet who's
// posting a slot before accepting. Mirrors the medic reputation block on
// /emt/[id], but there is no computed reliability for organizers — reputation is
// the published medic→organizer reviews only. The organizer's NAME is public
// exactly when they have ≥1 published review (migration 0014
// review_subjects_public_read), so a name-less fetch = no public reputation = 404.

const PLATFORM_MEAN = 4.5
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface OrgReview {
  id: string
  overall: number
  body: string | null
  author_role: string
}

const getOrganizer = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null
  const supabase = await createClient()
  const [{ data: profile }, { data: revs }] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", id).maybeSingle(),
    supabase
      .from("reviews")
      .select("id, overall, body, author_role")
      .eq("subject_user_id", id)
      .eq("author_role", "emt") // medic → organizer reviews only
      .eq("status", "published")
      .order("published_at", { ascending: false }),
  ])
  const reviews = (revs as OrgReview[] | null) ?? []
  // No published reviews ⇒ nothing public to show (and the name wouldn't be
  // public anyway). Treat as not found.
  if (reviews.length === 0) return null

  const replyByReview = new Map<string, string>()
  const reviewIds = reviews.map((r) => r.id)
  const { data: replyRows } = await supabase
    .from("review_replies")
    .select("review_id, body")
    .in("review_id", reviewIds)
  for (const rep of (replyRows as { review_id: string; body: string }[] | null) ?? []) {
    replyByReview.set(rep.review_id, rep.body)
  }

  return {
    name: (profile as { full_name: string | null } | null)?.full_name ?? "Event organizer",
    reviews,
    replyByReview,
  }
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const org = await getOrganizer(id)
  return { title: org ? `${org.name} — organizer reputation · Standby` : "Organizer — Standby" }
}

export default async function OrganizerReputationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const org = await getOrganizer(id)

  if (!org) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <span className="text-xs font-mono text-primary uppercase tracking-widest">404</span>
          <p className="text-muted-foreground text-sm">No public reputation for this organizer yet.</p>
          <Link href="/open-shifts" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Browse open shifts</Link>
        </div>
      </div>
    )
  }

  const rating = ratingDisplay(org.reviews.map((r) => r.overall), PLATFORM_MEAN)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">
        <Link href="/open-shifts" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground gap-1.5 -ml-2 w-fit")}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Open shifts
        </Link>

        <div className="flex flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Event organizer
          </span>
          <h1 className="text-foreground text-3xl md:text-4xl font-semibold tracking-tight">{org.name}</h1>
          <p className="text-sm text-muted-foreground">Reputation from medics who&apos;ve worked their events.</p>
        </div>

        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Reviews from medics</span>
              <div className="flex items-center gap-2">
                {rating.sparse ? (
                  <span className="font-mono text-[10px] uppercase tracking-widest border border-border text-muted-foreground px-2 py-0.5">{rating.badge}</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-foreground">
                    <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                    {rating.average?.toFixed(1)}
                  </span>
                )}
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {rating.count} {rating.count === 1 ? "review" : "reviews"}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-3 flex flex-col gap-3">
            {org.reviews.map((r) => {
              const reply = org.replyByReview.get(r.id)
              return (
                <div key={r.id} className="border border-border bg-surface px-4 py-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={cn("w-3 h-3", r.overall >= n ? "text-primary fill-primary" : "text-border")} />
                      ))}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">From a medic</span>
                      <ReportReviewButton reviewId={r.id} />
                    </div>
                  </div>
                  {r.body && <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>}
                  {reply && (
                    <div className="mt-1 border-l-2 border-border pl-3 flex flex-col gap-1">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Response from the organizer</span>
                      <p className="text-sm text-muted-foreground leading-relaxed">{reply}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
