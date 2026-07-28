import { cache } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Calendar, MapPin, Users, FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { BOOKING_COLUMNS, formatEventDate, mapBooking, type RawBooking, type Booking, type Applicant } from "@/lib/bookings"
import { joinedFullName, fetchCertLevels } from "@/lib/emt"
import { CertBadge } from "@/components/CertBadge"
import { OpenSlotManager, type OpenSlot } from "./open-slot-manager"
import { EVENT_TYPE_LABELS } from "@/lib/assessment"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AddToCalendarButton } from "@/components/AddToCalendarButton"
import { cn } from "@/lib/utils"

interface EventRow {
  id: string
  name: string
  event_type: string | null
  event_date: string | null
  venue_address: string | null
  expected_attendance: number | null
}

// RLS ("events owner all") returns the row only to its organizer; everyone else gets null.
const getEvent = cache(async (id: string): Promise<EventRow | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("events")
    .select("id, name, event_type, event_date, venue_address, expected_attendance")
    .eq("id", id)
    .maybeSingle()
  if (error) console.error("[/events/[id]] event query failed:", error.message)
  return (data as EventRow | null) ?? null
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const event = await getEvent(id)
  return { title: event ? `${event.name} — Standby` : "Event — Standby" }
}

const STATUS_STYLES: Record<Booking["status"], { label: string; className: string }> = {
  open:      { label: "Open slot", className: "border-primary/30 bg-primary/5 text-primary" },
  pending:   { label: "Pending",   className: "border-risk-medium/30 bg-risk-medium/5 text-risk-medium" },
  accepted:  { label: "Confirmed", className: "border-risk-low/30 bg-risk-low/5 text-risk-low" },
  declined:  { label: "Declined",  className: "border-border text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "border-border text-muted-foreground" },
}

const riskClassFor = (score: number) =>
  score <= 3 ? "border-risk-low/30 bg-risk-low/5 text-risk-low" :
  score <= 5 ? "border-risk-medium/30 bg-risk-medium/5 text-risk-medium" :
  "border-risk-high/30 bg-risk-high/5 text-risk-high"

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/auth?role=organizer&next=/events/${id}`)

  const event = await getEvent(id)

  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <span className="text-xs font-mono text-primary uppercase tracking-widest">404</span>
          <p className="text-muted-foreground text-sm">Event not found.</p>
          <Link href="/events" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Back to events
          </Link>
        </div>
      </div>
    )
  }

  // Assessment version history for this event
  const { data: assessments } = await supabase
    .from("assessments")
    .select("id, risk_score, expected_attendance, created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: true })

  const versions = assessments ?? []
  const latestScore = versions.length > 0 ? versions[versions.length - 1].risk_score ?? 0 : null

  // Roster — bookings linked to this event by event_id (§4.2). Deliberately NOT
  // matched by event_name: name-matching was the casing-drift bug. Bookings
  // created before event_id wiring (event_id IS NULL) will not appear here until
  // backfilled — that's the intended, explicit transition.
  const { data: rawBookings } = await supabase
    .from("bookings")
    .select(`${BOOKING_COLUMNS}, emt_id, emt:profiles!bookings_emt_id_fkey ( full_name )`)
    .eq("organizer_id", user.id)
    .eq("event_id", id)
    .order("created_at", { ascending: false })

  const certByEmt = await fetchCertLevels(
    supabase,
    (rawBookings ?? []).map((r) => r.emt_id as string | null).filter(Boolean) as string[]
  )

  const roster = (rawBookings ?? []).map((row) =>
    mapBooking(
      row as unknown as RawBooking,
      joinedFullName(row.emt) ?? "EMT",
      certByEmt.get(row.emt_id as string) ?? null
    )
  )

  // Open-claim: open slots (emt_id null) are managed separately from the assigned
  // roster — each gathers its applicants for the organizer to accept one.
  const openBookings = roster.filter((b) => b.status === "open")
  const assignedRoster = roster.filter((b) => b.status !== "open")

  const openSlots: OpenSlot[] = []
  if (openBookings.length > 0) {
    const openIds = openBookings.map((b) => b.id)
    // Applications on these open slots (RLS: applications visibility → the
    // booking's organizer sees every applicant).
    const { data: apps } = await supabase
      .from("booking_applications")
      .select("id, booking_id, emt_id, status, message, created_at")
      .in("booking_id", openIds)
      .order("created_at", { ascending: true })

    const emtIds = [...new Set((apps ?? []).map((a) => a.emt_id as string))]
    // Applicant display data — names via profiles (verified-EMT public read),
    // rate/cert/location via emt_profiles public columns. No credential PII.
    const [{ data: profs }, { data: emtProfs }] = await Promise.all([
      emtIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", emtIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      emtIds.length
        ? supabase.from("emt_profiles").select("user_id, cert_level, hourly_rate, city, state").in("user_id", emtIds)
        : Promise.resolve({ data: [] as { user_id: string; cert_level: string | null; hourly_rate: number | null; city: string | null; state: string | null }[] }),
    ])
    const nameById = new Map((profs ?? []).map((p) => [p.id, p.full_name]))
    const emtById = new Map((emtProfs ?? []).map((e) => [e.user_id, e]))

    const applicantsByBooking = new Map<string, Applicant[]>()
    for (const a of apps ?? []) {
      const ep = emtById.get(a.emt_id as string)
      const list = applicantsByBooking.get(a.booking_id as string) ?? []
      list.push({
        applicationId: a.id as string,
        bookingId: a.booking_id as string,
        emtId: a.emt_id as string,
        emtName: nameById.get(a.emt_id as string) ?? "EMT",
        status: a.status as Applicant["status"],
        message: (a.message as string | null) ?? null,
        createdISO: a.created_at as string,
        certLevel: ep?.cert_level ?? null,
        hourlyRate: ep?.hourly_rate ?? null,
        city: ep?.city ?? null,
        state: ep?.state ?? null,
      })
      applicantsByBooking.set(a.booking_id as string, list)
    }

    for (const b of openBookings) {
      openSlots.push({
        id: b.id,
        dateISO: b.dateISO,
        durationHours: b.durationHours,
        hourlyRate: b.hourlyRate,
        notes: b.notes,
        applicants: applicantsByBooking.get(b.id) ?? [],
      })
    }
  }

  const shortDate = (ts: string) =>
    new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-10">
        {/* Breadcrumb */}
        <Link
          href="/events"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground gap-1.5 -ml-2 w-fit")}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Events
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Event</span>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-foreground text-2xl md:text-3xl font-semibold leading-tight">{event.name}</h1>
            {latestScore !== null && (
              <span className={`font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 tabular-nums ${riskClassFor(latestScore)}`}>
                Risk {latestScore}/10
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-muted-foreground">
            <span>{EVENT_TYPE_LABELS[event.event_type ?? ""] ?? event.event_type ?? "—"}</span>
            {event.event_date && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{formatEventDate(event.event_date)}</span>}
            {event.venue_address && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{event.venue_address}</span>}
            {event.expected_attendance ? <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{event.expected_attendance.toLocaleString()} attendees</span> : null}
          </div>
        </div>

        {/* Assessment history */}
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Assessment history</h2>
          {versions.length === 0 ? (
            <div className="border border-border bg-card px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">No saved assessments for this event yet.</p>
            </div>
          ) : (
            <div className="border border-border bg-card flex flex-col gap-2 px-5 py-4">
              {versions.map((v, i) => {
                const prev = i > 0 ? versions[i - 1] : null
                const sDelta = prev ? (v.risk_score ?? 0) - (prev.risk_score ?? 0) : 0
                return (
                  <div key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono tabular-nums">
                    <span className="text-muted-foreground w-7 shrink-0">v{i + 1}</span>
                    <span className="text-muted-foreground">{shortDate(v.created_at)}</span>
                    <span className="text-foreground">{(v.expected_attendance ?? 0).toLocaleString()} att</span>
                    <span className="text-foreground">Risk {v.risk_score ?? 0}/10</span>
                    {prev && sDelta !== 0 && (
                      <span className={sDelta > 0 ? "text-risk-high" : "text-risk-low"}>
                        {sDelta > 0 ? "↑" : "↓"} {Math.abs(sDelta)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Open slots (open-claim) — post a slot, review applicants, accept one */}
        <OpenSlotManager
          eventId={id}
          viewerId={user.id}
          event={{
            name: event.name,
            eventType: event.event_type ?? "",
            eventDate: event.event_date,
            venueAddress: event.venue_address,
            expectedAttendance: event.expected_attendance,
          }}
          openSlots={openSlots}
        />

        {/* Staffing roster — assigned bookings (direct requests + accepted open slots) */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Staffing roster</h2>
            {assignedRoster.length > 0 && (
              <span className="font-mono text-[10px] border border-border text-muted-foreground px-2 py-0.5 tabular-nums">
                {assignedRoster.length}
              </span>
            )}
          </div>
          {assignedRoster.length === 0 ? (
            <div className="border border-border bg-card px-6 py-8 flex flex-col items-center gap-3 text-center">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground max-w-sm">No personnel requested for this event yet.</p>
              <Link href="/personnel" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none font-mono text-[10px] uppercase tracking-wider")}>
                Find staffing
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-px">
              {assignedRoster.map((b) => {
                const status = STATUS_STYLES[b.status]
                return (
                  <div key={b.id} className="border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-foreground font-medium leading-tight truncate flex items-center gap-2">
                        <span className="truncate">{b.counterpartName}</span>
                        <CertBadge level={b.certLevel} />
                      </span>
                      <span className="text-muted-foreground text-xs font-mono tabular-nums">
                        {b.date} · {b.durationHours} hrs · ${b.hourlyRate}/hr
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {b.status === "accepted" && (
                        <AddToCalendarButton
                          eventName={b.eventName}
                          dateISO={b.dateISO}
                          location={b.location}
                          durationHours={b.durationHours}
                          counterpartName={b.counterpartName}
                        />
                      )}
                      <span className={`font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
