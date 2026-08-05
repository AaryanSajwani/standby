import { cache } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Shield, MapPin, Clock, ShieldCheck, DollarSign, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { CERT_DISPLAY, EMT_PUBLIC_COLUMNS, joinedFullName } from "@/lib/emt"
import { fetchUpcomingAvailability, formatAvailabilityDate } from "@/lib/availability"
import { ratingDisplay, formatRate } from "@/lib/reviews/reliability"
import { ReportReviewButton } from "@/components/reviews/ReportReviewButton"
import { RequestEmt } from "./request-emt"

// Platform-mean prior for star shrinkage until there's enough data to compute a
// real global mean. Neutral-positive; sparse profiles show "New to Standby"
// anyway (under MIN_REVIEWS_FOR_AVERAGE), so this only shades established ones.
const PLATFORM_MEAN = 4.5

interface EMTProfile {
  name: string
  certification: string
  eventTypes: string[]
  radiusMiles: number
  available: boolean
  bio: string
  yearsExperience?: number
  hourlyRate?: number
  location?: string
  verified?: boolean
}

// Mock data — kept for the numeric sample-profile ids shown when no
// verified EMTs exist yet. Real profiles use UUID ids and hit Supabase.
const MOCK_EMT_DATA: Record<number, EMTProfile> = {
  1:  { name: "Marcus Chen",      certification: "EMT-B", yearsExperience: 8,  eventTypes: ["Concerts", "Sports", "Festivals"],               radiusMiles: 50,  available: true,  bio: "EMT with 8 years of mass-gathering event experience. Specializes in high-density crowd medicine and rapid triage protocols." },
  2:  { name: "Sarah Mitchell",   certification: "EMT-B", yearsExperience: 4,  eventTypes: ["Corporate", "Private Events"],                   radiusMiles: 25,  available: true,  bio: "EMT-Basic focused on corporate and private event coverage. Known for calm patient management and thorough documentation." },
  3:  { name: "David Rodriguez",  certification: "EMT-B", yearsExperience: 12, eventTypes: ["Film & TV", "Concerts", "Sports"],               radiusMiles: 75,  available: false, bio: "Senior EMT with extensive production set and live event experience across 12 years of field work." },
  4:  { name: "Emily Thompson",   certification: "EMR",   yearsExperience: 2,  eventTypes: ["Corporate", "Festivals"],                        radiusMiles: 30,  available: true,  bio: "Certified EMR with strong festival and corporate event background. Currently completing EMT-B coursework." },
  5:  { name: "James Wilson",     certification: "EMT-B", yearsExperience: 6,  eventTypes: ["Sports", "Concerts"],                            radiusMiles: 40,  available: true,  bio: "Six years covering collegiate and professional sporting events. Experienced in athletic injury assessment and sideline protocols." },
  6:  { name: "Lisa Nakamura",    certification: "EMT-B", yearsExperience: 10, eventTypes: ["Film & TV", "Private Events", "Corporate"],      radiusMiles: 60,  available: true,  bio: "EMT specializing in high-profile private and production events. Holds additional CPR and first-aid instructor certifications." },
  7:  { name: "Robert Garcia",    certification: "EMR",   yearsExperience: 3,  eventTypes: ["Festivals", "Concerts"],                         radiusMiles: 35,  available: false, bio: "EMR with 3 years of outdoor festival experience including multi-day events and remote venue operations." },
  8:  { name: "Amanda Foster",    certification: "EMT-B", yearsExperience: 5,  eventTypes: ["Sports", "Corporate"],                           radiusMiles: 45,  available: true,  bio: "Five years of corporate and sports event coverage. Experienced coordinator for multi-unit event medical teams." },
  9:  { name: "Michael Park",     certification: "EMT-B", yearsExperience: 15, eventTypes: ["Concerts", "Festivals", "Film & TV", "Sports"],  radiusMiles: 100, available: true,  bio: "Senior EMT with 15 years across every major event category. Experienced lead for large-scale event medical teams." },
  10: { name: "Jennifer Adams",   certification: "EMR",   yearsExperience: 1,  eventTypes: ["Private Events"],                                radiusMiles: 20,  available: true,  bio: "Recent EMR certification with private event focus. Strong patient communication and documentation skills." },
  11: { name: "Christopher Lee",  certification: "EMT-B", yearsExperience: 7,  eventTypes: ["Sports", "Festivals", "Concerts"],               radiusMiles: 55,  available: false, bio: "Seven years of live event coverage across sporting, festival, and concert venues. CPR and AED instructor certified." },
  12: { name: "Rachel Kim",       certification: "EMT-B", yearsExperience: 9,  eventTypes: ["Film & TV", "Corporate"],                        radiusMiles: 70,  available: true,  bio: "EMT with deep film and television production experience. Familiar with SAG-AFTRA set safety protocols." },
  13: { name: "Daniel Brown",     certification: "EMT-B", yearsExperience: 4,  eventTypes: ["Concerts", "Private Events"],                    radiusMiles: 30,  available: true,  bio: "Four years of concert and private event coverage. Experienced with general admission crowd management scenarios." },
  14: { name: "Nicole Martinez",  certification: "EMT-B", yearsExperience: 6,  eventTypes: ["Festivals", "Sports", "Corporate"],              radiusMiles: 45,  available: true,  bio: "Versatile EMT-Basic covering festivals, sporting events, and corporate functions. Bilingual — English and Spanish." },
  15: { name: "Kevin O'Brien",    certification: "EMT-B", yearsExperience: 11, eventTypes: ["Sports", "Concerts", "Film & TV"],               radiusMiles: 65,  available: true,  bio: "Eleven years as an EMT across sports, concerts, and film productions. Former collegiate athlete with strong sports medicine background." },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// cache() dedupes the fetch so generateMetadata and the page share one query per request
const getEmt = cache(async (id: string): Promise<EMTProfile | null> => {
  // Numeric ids are mock sample profiles
  if (/^\d+$/.test(id)) return MOCK_EMT_DATA[parseInt(id, 10)] ?? null

  // Anything else must be a UUID — junk ids would only 400 at Postgres on the
  // uuid cast, so skip the roundtrip (and the error-log noise) entirely
  if (!UUID_RE.test(id)) return null

  // UUID ids are real profiles. Explicit column list only — RLS lets the
  // public see verified rows (and owners their own), but credential PII
  // (license_number etc.) must never be selected here.
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("emt_profiles")
    .select(`${EMT_PUBLIC_COLUMNS}, profiles!inner ( full_name )`)
    .eq("user_id", id)
    .maybeSingle()

  if (error) console.error("[/emt/[id]] emt_profiles query failed:", error.message)
  if (!data) return null

  return {
    name:          joinedFullName(data.profiles) ?? "Unknown EMT",
    certification: CERT_DISPLAY[data.cert_level] ?? "EMT-B",
    eventTypes:    Array.isArray(data.specializations) ? data.specializations : [],
    radiusMiles:   data.service_radius_miles ?? 0,
    available:     data.available ?? false,
    bio:           data.bio ?? "No background provided yet.",
    hourlyRate:    data.hourly_rate ?? undefined,
    location:      [data.city, data.state].filter(Boolean).join(", "),
    verified:      data.verified ?? false,
  }
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const emt = await getEmt(id)
  return {
    title: emt ? `${emt.name} — ${emt.certification} · Standby` : "EMT Profile — Standby",
  }
}

export default async function EMTProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const emt = await getEmt(id)
  const isReal = !/^\d+$/.test(id)

  // Who's viewing — drives the Request CTA (sign-in redirect vs form)
  const supabase = await createClient()
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser()

  // Upcoming available dates (real profiles only; [] if the table isn't present)
  const availability = isReal ? await fetchUpcomingAvailability(supabase, id, 12) : []

  // Reputation (real profiles only): reliability is COMPUTED from bookings and
  // shown above star averages; reviews are the published double-blind pair. Mock
  // sample profiles carry NO reputation — never fabricate trust signals.
  type RelRow = { completed_count: number; committed_count: number; no_show_count: number; late_cancel_count: number; check_in_count: number; late_cancel_90d: number; no_show_365d: number }
  type PubReview = { id: string; overall: number; body: string | null; author_role: string }
  let reliability: RelRow | null = null
  let publishedReviews: PubReview[] = []
  // The subject's public reply per review (review_id → body). Replies to a
  // published review are public via RLS.
  const replyByReview = new Map<string, string>()
  if (isReal) {
    const [{ data: rel }, { data: revs }] = await Promise.all([
      supabase.from("emt_reliability_stats").select("completed_count, committed_count, no_show_count, late_cancel_count, check_in_count, late_cancel_90d, no_show_365d").eq("emt_id", id).maybeSingle(),
      supabase.from("reviews").select("id, overall, body, author_role").eq("subject_user_id", id).eq("status", "published").order("published_at", { ascending: false }),
    ])
    reliability = (rel as RelRow | null) ?? null
    publishedReviews = (revs as PubReview[] | null) ?? []
    const reviewIds = publishedReviews.map((r) => r.id)
    if (reviewIds.length) {
      const { data: replyRows } = await supabase
        .from("review_replies")
        .select("review_id, body")
        .in("review_id", reviewIds)
      for (const rep of (replyRows as { review_id: string; body: string }[] | null) ?? []) {
        replyByReview.set(rep.review_id, rep.body)
      }
    }
  }
  const rating = ratingDisplay(publishedReviews.map((r) => r.overall), PLATFORM_MEAN)
  const completionRate = reliability && reliability.committed_count > 0 ? reliability.completed_count / reliability.committed_count : null
  const hasReputation = isReal && ((reliability?.committed_count ?? 0) > 0 || publishedReviews.length > 0)

  if (!emt) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <span className="text-xs font-mono text-primary uppercase tracking-widest">404</span>
          <p className="text-muted-foreground text-sm">EMT profile not found.</p>
          <Link href="/personnel" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Back to personnel
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Breadcrumb header */}
      <div className="border-b border-border bg-surface/80 px-8 py-4 flex items-center gap-3 shrink-0">
        <Link href="/personnel" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground gap-1.5 -ml-2")}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Personnel
        </Link>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          EMT Profile
        </span>
      </div>

      <div className="max-w-4xl mx-auto w-full px-8 py-10 space-y-6">
        {/* Name + badges */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="font-mono text-xs tracking-wider uppercase">
              {emt.certification}
            </Badge>
            {emt.verified && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest border border-primary/30 bg-primary/5 text-primary px-2 py-0.5">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            )}
            <Badge
              variant="outline"
              className={
                emt.available
                  ? "font-mono text-xs border-risk-low text-risk-low bg-risk-low/10"
                  : "font-mono text-xs text-muted-foreground"
              }
            >
              {emt.available ? "Available" : "Unavailable"}
            </Badge>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">{emt.name}</h1>
          {emt.location && (
            <p className="font-mono text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {emt.location}
            </p>
          )}
        </div>

        {/* Stats row — a superset of the marketplace card: rate is always shown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
          <div className="bg-card px-6 py-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Rate
            </p>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-2xl font-bold tabular-nums">{emt.hourlyRate ?? "—"}</span>
              <span className="text-sm text-muted-foreground">/hour</span>
            </div>
          </div>
          {emt.yearsExperience !== undefined && (
            <div className="bg-card px-6 py-5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                Experience
              </p>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-2xl font-bold tabular-nums">{emt.yearsExperience}</span>
                <span className="text-sm text-muted-foreground">years</span>
              </div>
            </div>
          )}
          <div className="bg-card px-6 py-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Service radius
            </p>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-2xl font-bold tabular-nums">{emt.radiusMiles}</span>
              <span className="text-sm text-muted-foreground">miles</span>
            </div>
          </div>
          <div className="bg-card px-6 py-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Availability
            </p>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm">
                {emt.available ? "Available" : "Currently booked"}
              </span>
            </div>
          </div>
        </div>

        {/* Reputation — reliability (computed) above star reviews. Real profiles only. */}
        {hasReputation && (
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader className="pb-0">
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Reliability</span>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
                  {[
                    { label: "Completed shifts", value: String(reliability?.completed_count ?? 0) },
                    { label: "Completion rate", value: formatRate(completionRate) },
                    { label: "No-shows (365d)", value: String(reliability?.no_show_365d ?? 0) },
                    { label: "Late cancels (90d)", value: String(reliability?.late_cancel_90d ?? 0) },
                  ].map((s) => (
                    <div key={s.label} className="bg-card px-5 py-4 flex flex-col gap-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{s.label}</span>
                      <span className="font-mono text-2xl font-bold tabular-nums text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
                <p className="font-mono text-[10px] text-muted-foreground mt-3">Computed from completed bookings — not self-reported.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Reviews</span>
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
                {publishedReviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No published reviews yet.</p>
                ) : (
                  publishedReviews.map((r, i) => {
                    const reply = replyByReview.get(r.id)
                    return (
                      <div key={i} className="border border-border bg-surface px-4 py-3 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} className={cn("w-3 h-3", r.overall >= n ? "text-primary fill-primary" : "text-border")} />
                            ))}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                              {r.author_role === "organizer" ? "From an organizer" : "From a medic"}
                            </span>
                            <ReportReviewButton reviewId={r.id} />
                          </div>
                        </div>
                        {r.body && <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>}
                        {reply && (
                          <div className="mt-1 border-l-2 border-border pl-3 flex flex-col gap-1">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Response from this medic</span>
                            <p className="text-sm text-muted-foreground leading-relaxed">{reply}</p>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Background */}
        <Card>
          <CardHeader className="pb-0">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Background
            </span>
          </CardHeader>
          <CardContent className="pt-3">
            <p className="text-foreground/90 leading-relaxed">{emt.bio}</p>
          </CardContent>
        </Card>

        {/* Event Types */}
        {emt.eventTypes.length > 0 && (
          <Card>
            <CardHeader className="pb-0">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Event Type Experience
              </span>
            </CardHeader>
            <CardContent className="pt-3 flex flex-wrap gap-2">
              {emt.eventTypes.map((type) => (
                <Badge key={type} variant="secondary" className="font-mono text-xs uppercase tracking-wider">
                  {type}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Availability */}
        {availability.length > 0 && (
          <Card>
            <CardHeader className="pb-0">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Available dates
              </span>
            </CardHeader>
            <CardContent className="pt-3 flex flex-wrap gap-2">
              {availability.map((d) => (
                <span
                  key={d.id}
                  className="inline-flex items-center border border-border bg-surface px-2.5 py-1 font-mono text-xs tabular-nums text-foreground"
                >
                  {formatAvailabilityDate(d.date)}
                </span>
              ))}
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        {isReal ? (
          <RequestEmt
            emtId={id}
            emtName={emt.name}
            hourlyRate={emt.hourlyRate ?? 0}
            available={emt.available}
            viewerId={viewer?.id ?? null}
          />
        ) : (
          // Sample profiles aren't bookable — no real user behind them
          <div className="flex items-center gap-3">
            <Button
              disabled
              className="font-mono text-xs tracking-wider uppercase px-8"
            >
              Sample profile
            </Button>
            <Link href="/personnel" className={cn(buttonVariants({ variant: "outline" }), "font-mono text-xs tracking-wider uppercase")}>
              Browse more personnel
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
