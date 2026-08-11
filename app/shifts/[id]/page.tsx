import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Calendar, MapPin, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { formatEventDate, bookingRateDollars } from "@/lib/bookings"
import { buttonVariants } from "@/components/ui/button"
import { CertBadge } from "@/components/CertBadge"
import { cn } from "@/lib/utils"
import { ShiftClient, type ShiftReview, type ShiftReply } from "./shift-client"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Shift — Standby" }

interface ShiftBooking {
  id: string
  organizer_id: string
  emt_id: string | null
  event_name: string
  event_type: string
  event_date: string
  starts_at: string | null
  location: string
  duration_hours: number
  offered_rate: number
  rate_cents: number | null
  status: string
}

export default async function ShiftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth?next=/shifts/${id}`)

  // Participant-only RLS: a non-participant reads null → 404.
  const { data: bk } = await supabase
    .from("bookings")
    .select("id, organizer_id, emt_id, event_name, event_type, event_date, starts_at, location, duration_hours, offered_rate, rate_cents, status")
    .eq("id", id)
    .maybeSingle()

  const booking = bk as ShiftBooking | null
  const viewerRole: "organizer" | "emt" | null =
    booking?.organizer_id === user.id ? "organizer" : booking?.emt_id === user.id ? "emt" : null

  if (!booking || !viewerRole) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <span className="text-xs font-mono text-primary uppercase tracking-widest">404</span>
          <p className="text-muted-foreground text-sm">Shift not found.</p>
          <Link href="/emt-dashboard" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Back to dashboard</Link>
        </div>
      </div>
    )
  }

  const counterpartId = viewerRole === "organizer" ? booking.emt_id : booking.organizer_id

  // Counterpart display name (booking_participants_read lets each party read the
  // other's name) + medic cert tier for the organizer's view.
  const [{ data: counterpartProfile }, { data: medicProfile }, { data: myReviewRow }, { data: theirReviewRow }] =
    await Promise.all([
      counterpartId
        ? supabase.from("profiles").select("full_name").eq("id", counterpartId).maybeSingle()
        : Promise.resolve({ data: null as { full_name: string | null } | null }),
      booking.emt_id
        ? supabase.from("emt_profiles").select("cert_level").eq("user_id", booking.emt_id).maybeSingle()
        : Promise.resolve({ data: null as { cert_level: string | null } | null }),
      // My own review (any status — authors read their own).
      supabase.from("reviews").select("id, overall, subscores, body, status, published_at, edited_at").eq("booking_id", id).eq("author_user_id", user.id).maybeSingle(),
      // Counterpart's review — only visible once published (double-blind).
      counterpartId
        ? supabase.from("reviews").select("id, overall, subscores, body, status, published_at, edited_at").eq("booking_id", id).eq("author_user_id", counterpartId).eq("status", "published").maybeSingle()
        : Promise.resolve({ data: null }),
    ])

  const myReview = (myReviewRow as ShiftReview | null) ?? null
  const counterpartReview = (theirReviewRow as ShiftReview | null) ?? null

  // Replies to either review. RLS: a reply is visible when its parent is
  // published (public) or the caller authored it. My reply to their review and
  // the counterpart's reply to my review both resolve here.
  const reviewIds = [myReview?.id, counterpartReview?.id].filter(Boolean) as string[]
  const { data: replyRows } = reviewIds.length
    ? await supabase
        .from("review_replies")
        .select("id, review_id, author_user_id, body, edited_at, created_at")
        .in("review_id", reviewIds)
    : { data: [] as ShiftReply[] }
  const replies = (replyRows as ShiftReply[] | null) ?? []
  // The counterpart's reply to MY review (read-only for me), and MY reply to
  // THEIR review (which I can post/edit).
  const replyToMyReview = myReview ? replies.find((r) => r.review_id === myReview.id) ?? null : null
  const myReplyToTheirReview = counterpartReview
    ? replies.find((r) => r.review_id === counterpartReview.id && r.author_user_id === user.id) ?? null
    : null

  const counterpartName = counterpartProfile?.full_name ?? (viewerRole === "organizer" ? "Medic" : "Organizer")

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
        <Link
          href={viewerRole === "organizer" ? "/events" : "/emt-dashboard"}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground gap-1.5 -ml-2 w-fit")}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {viewerRole === "organizer" ? "Events" : "Dashboard"}
        </Link>

        {/* Shift summary */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Shift</span>
          <h1 className="text-foreground text-2xl md:text-3xl font-semibold leading-tight">{booking.event_name}</h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              {viewerRole === "emt" && counterpartId ? (
                <Link href={`/organizer/${counterpartId}`} className="hover:text-foreground underline underline-offset-2 decoration-dotted">
                  {counterpartName}
                </Link>
              ) : (
                counterpartName
              )}
              {viewerRole === "organizer" && <CertBadge level={medicProfile?.cert_level ?? null} />}
            </span>
            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{formatEventDate(booking.event_date)}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{booking.location}</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{booking.duration_hours} hrs · ${bookingRateDollars(booking.rate_cents, booking.offered_rate)}/hr</span>
          </div>
        </div>

        <ShiftClient
          bookingId={booking.id}
          viewerRole={viewerRole}
          viewerId={user.id}
          status={booking.status}
          startsAtISO={booking.starts_at}
          offeredRate={bookingRateDollars(booking.rate_cents, booking.offered_rate)}
          counterpartName={counterpartName}
          myReview={myReview}
          counterpartReview={counterpartReview}
          replyToMyReview={replyToMyReview}
          myReplyToTheirReview={myReplyToTheirReview}
        />
      </div>
    </main>
  )
}
