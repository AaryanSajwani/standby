"use client"

import { useRef, useState } from "react"
import { Calendar, MapPin, Users, Clock, Check, X, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AddToCalendarButton } from "@/components/AddToCalendarButton"
import type { Booking, BookingStatus } from "@/lib/bookings"
import type { AvailabilityDate } from "@/lib/availability"
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar"

function RequestCard({
  req,
  onAccept,
  onDecline,
  past = false,
}: {
  req: Booking
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  /** Accepted shift whose event date has passed — history, not actionable. */
  past?: boolean
}) {
  const isPending   = req.status === "pending"
  const isAccepted  = req.status === "accepted" && !past
  const isCompleted = req.status === "accepted" && past
  const isDeclined  = req.status === "declined"
  const isCancelled = req.status === "cancelled"

  return (
    <div className={`border border-border bg-card flex flex-col gap-0 transition-opacity ${isDeclined || isCancelled ? "opacity-40" : ""}`}>
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-foreground font-medium text-base leading-tight truncate">{req.eventName}</span>
          <span className="text-muted-foreground text-xs font-mono">{req.eventType} · {req.counterpartName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isPending && (
            <span className="font-mono text-[10px] uppercase tracking-widest border border-risk-medium/30 bg-risk-medium/5 text-risk-medium px-2 py-0.5">
              Pending
            </span>
          )}
          {isAccepted && (
            <span className="font-mono text-[10px] uppercase tracking-widest border border-risk-low/30 bg-risk-low/5 text-risk-low px-2 py-0.5">
              Accepted
            </span>
          )}
          {isCompleted && (
            <span className="font-mono text-[10px] uppercase tracking-widest border border-border text-muted-foreground px-2 py-0.5">
              Completed
            </span>
          )}
          {isDeclined && (
            <span className="font-mono text-[10px] uppercase tracking-widest border border-border text-muted-foreground px-2 py-0.5">
              Declined
            </span>
          )}
          {isCancelled && (
            <span className="font-mono text-[10px] uppercase tracking-widest border border-border text-muted-foreground px-2 py-0.5">
              Cancelled
            </span>
          )}
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-y md:divide-y-0 divide-border">
        {[
          { icon: <Calendar className="w-3 h-3" />, label: "Date",       value: req.date },
          { icon: <MapPin   className="w-3 h-3" />, label: "Location",   value: req.location },
          { icon: <Users    className="w-3 h-3" />, label: "Attendance", value: req.attendance.toLocaleString() },
          { icon: <Clock    className="w-3 h-3" />, label: "Duration",   value: `${req.durationHours} hrs` },
        ].map(({ icon, label, value }) => (
          <div key={label} className="flex flex-col gap-1 px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              {icon}{label}
            </span>
            <span className="font-mono text-sm tabular-nums text-foreground">{value}</span>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex flex-col md:flex-row gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
        <div className="flex flex-col justify-center gap-1 px-5 py-4 md:w-40 shrink-0">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Rate</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl tabular-nums font-bold text-foreground">${req.hourlyRate}</span>
            <span className="font-mono text-xs text-muted-foreground">/hr</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            ${Math.round(req.hourlyRate * req.durationHours).toLocaleString()} total est.
          </span>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-1 px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Notes from organizer</span>
          <p className="text-sm text-muted-foreground leading-relaxed">{req.notes ?? "No notes provided."}</p>
        </div>
        {isPending && (
          <div className="flex flex-col justify-center gap-2 px-5 py-4 md:w-44 shrink-0">
            <Button className="w-full rounded-none font-mono text-xs uppercase tracking-wider" onClick={() => onAccept(req.id)}>
              <Check className="w-3.5 h-3.5 mr-1.5" />Accept shift
            </Button>
            <Button variant="outline" className="w-full rounded-none font-mono text-xs uppercase tracking-wider" onClick={() => onDecline(req.id)}>
              <X className="w-3.5 h-3.5 mr-1.5" />Decline
            </Button>
          </div>
        )}
        {isAccepted && (
          <div className="flex flex-col justify-center gap-2 px-5 py-4 md:w-44 shrink-0">
            <AddToCalendarButton
              eventName={req.eventName}
              dateISO={req.dateISO}
              location={req.location}
              durationHours={req.durationHours}
              counterpartName={req.counterpartName}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}

interface DashboardContentProps {
  displayName: string
  verified: boolean
  available: boolean
  userId: string
  bookings: Booking[]
  availability: AvailabilityDate[]
}

export function DashboardContent({ displayName, verified, available, userId, bookings, availability }: DashboardContentProps) {
  const [requests, setRequests] = useState<Booking[]>(bookings)
  const [isAvailable, setIsAvailable] = useState(available)
  const [error, setError] = useState<string | null>(null)

  // Availability calendar (emt_availability). Local state updates live while
  // dragging; the DB write happens once per drag session (onDragEnd), diffing
  // against what's known to be persisted instead of wipe-and-reinsert.
  const [dates, setDates] = useState<string[]>(() => availability.map((a) => a.date))
  const [savingDates, setSavingDates] = useState(false)
  const datesRef = useRef<string[]>(dates)
  datesRef.current = dates
  const savedDatesRef = useRef<Set<string>>(new Set(availability.map((a) => a.date)))
  const todayISO = new Date().toISOString().slice(0, 10)
  // emt_availability_date_sane (migration 0004) rejects dates > today + 2 years
  const maxDateISO = (() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 2)
    return d.toISOString().slice(0, 10)
  })()

  const persistAvailability = async (override?: string[]) => {
    const next = new Set(override ?? datesRef.current)
    const saved = savedDatesRef.current
    const adds = [...next].filter((d) => !saved.has(d))
    const removes = [...saved].filter((d) => !next.has(d))
    if (adds.length === 0 && removes.length === 0) return

    setSavingDates(true)
    setError(null)
    const supabase = createClient()

    if (adds.length > 0) {
      // ignoreDuplicates → ON CONFLICT DO NOTHING on (emt_id, date), so a
      // stale client state can't fail the whole save on an existing row
      const { error: insertError } = await supabase
        .from("emt_availability")
        .upsert(adds.map((date) => ({ emt_id: userId, date })), {
          onConflict: "emt_id,date",
          ignoreDuplicates: true,
        })
      if (insertError) {
        setError(`Could not save availability: ${insertError.message}`)
        setDates([...saved].sort())
        setSavingDates(false)
        return
      }
      adds.forEach((d) => saved.add(d))
    }

    if (removes.length > 0) {
      const { error: deleteError } = await supabase
        .from("emt_availability")
        .delete()
        .eq("emt_id", userId)
        .in("date", removes)
      if (deleteError) {
        setError(`Could not save availability: ${deleteError.message}`)
        setDates([...saved].sort())
        setSavingDates(false)
        return
      }
      removes.forEach((d) => saved.delete(d))
    }

    setSavingDates(false)
  }

  const clearAvailability = () => {
    setDates([])
    void persistAvailability([])
  }

  const pending  = requests.filter((r) => r.status === "pending")
  // Accepted splits on event date: today or later = upcoming, earlier = past
  // history. dateISO is raw YYYY-MM-DD, so string compare is date compare.
  const accepted = requests.filter((r) => r.status === "accepted")
  const upcoming = accepted.filter((r) => !r.dateISO || r.dateISO >= todayISO)
  const past     = accepted
    .filter((r) => r.dateISO && r.dateISO < todayISO)
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO)) // most recent first
  const resolved = requests.filter((r) => r.status === "declined" || r.status === "cancelled")

  // Optimistic status update — revert on failure
  const updateStatus = async (id: string, status: BookingStatus) => {
    const previous = requests
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id)

    if (updateError) {
      setRequests(previous)
      setError(`Could not update request: ${updateError.message}`)
      return
    }
    // Best-effort email to the organizer — server rebuilds content from the DB
    // and verifies the stored status matches. Failure never blocks the update.
    if (status === "accepted" || status === "declined") {
      void fetch("/api/notifications/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, event: status }),
      }).catch(() => {})
    }
  }

  const accept  = (id: string) => updateStatus(id, "accepted")
  const decline = (id: string) => updateStatus(id, "declined")

  const toggleAvailable = async () => {
    const next = !isAvailable
    setIsAvailable(next)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from("emt_profiles")
      .update({ available: next })
      .eq("user_id", userId)

    if (updateError) {
      setIsAvailable(!next)
      setError(`Could not update availability: ${updateError.message}`)
    }
  }

  const totalEarnings = upcoming.reduce((sum, r) => sum + r.hourlyRate * r.durationHours, 0)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-10">

        {/* Verification banner */}
        {!verified && (
          <div className="border border-risk-medium/40 bg-risk-medium/5 px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-risk-medium shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xs uppercase tracking-widest text-risk-medium">
                Pending verification
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your credentials are under review. You&apos;ll appear in the marketplace once verified —
                usually within 1–2 business days.
              </p>
            </div>
          </div>
        )}

        {/* Action error */}
        {error && (
          <div className="border border-destructive/30 bg-destructive/5 px-5 py-3">
            <p className="font-mono text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">EMT Dashboard</span>
            <h1 className="text-foreground text-2xl md:text-3xl font-semibold leading-tight">
              Welcome back, {displayName}.
            </h1>
            <p className="text-muted-foreground text-sm">
              Review incoming event requests and manage your upcoming shifts.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleAvailable}
            className="flex items-center gap-2 group cursor-pointer"
            title={isAvailable ? "Click to mark unavailable" : "Click to mark available"}
          >
            <span className={`w-1.5 h-1.5 ${isAvailable ? "bg-risk-low" : "bg-muted-foreground"}`} />
            <span className={`font-mono text-xs uppercase tracking-widest group-hover:underline underline-offset-4 ${isAvailable ? "text-risk-low" : "text-muted-foreground"}`}>
              {isAvailable ? "Available for bookings" : "Unavailable"}
            </span>
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 border border-border divide-x divide-border">
          <div className="flex flex-col gap-1 px-5 py-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Pending requests</span>
            <span className="font-mono text-3xl tabular-nums font-bold text-foreground">{pending.length}</span>
          </div>
          <div className="flex flex-col gap-1 px-5 py-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Upcoming shifts</span>
            <span className="font-mono text-3xl tabular-nums font-bold text-foreground">{upcoming.length}</span>
          </div>
          <div className="flex flex-col gap-1 px-5 py-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Est. earnings</span>
            <span className="font-mono text-3xl tabular-nums font-bold text-foreground">${Math.round(totalEarnings).toLocaleString()}</span>
          </div>
        </div>

        {/* Availability calendar */}
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Your availability</h2>
          <div className="border border-border bg-card p-5 flex flex-col gap-4 max-w-md">
            <p className="text-sm text-muted-foreground">
              Click and drag across the days you can cover — changes save automatically.
              Organizers see these dates on your profile.
            </p>
            <AvailabilityCalendar
              mode="multi"
              value={dates}
              onChange={setDates}
              onDragEnd={() => void persistAvailability()}
              disableBefore={todayISO}
              disableAfter={maxDateISO}
            />
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-mono text-xs tabular-nums text-foreground">
                {dates.length} {dates.length === 1 ? "day" : "days"} marked
                {savingDates && <span className="text-muted-foreground"> · Saving…</span>}
              </span>
              {dates.length > 0 && (
                <button
                  type="button"
                  onClick={clearAvailability}
                  className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-risk-high transition-colors"
                >
                  <X className="w-3 h-3" /> Clear all dates
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Pending requests */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Incoming requests</h2>
            {pending.length > 0 && (
              <span className="font-mono text-[10px] border border-primary/30 bg-primary/5 text-primary px-2 py-0.5 tabular-nums">
                {pending.length} pending
              </span>
            )}
          </div>
          {pending.length === 0 ? (
            <div className="border border-border bg-card px-6 py-10 flex flex-col items-center gap-2 text-center">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {requests.length === 0 ? "No requests yet" : "No pending requests"}
              </span>
              <p className="text-sm text-muted-foreground max-w-xs">
                {requests.length === 0
                  ? "Complete your profile and stay available to get matched."
                  : "New booking requests from event organizers will appear here."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-px">
              {pending.map((req) => <RequestCard key={req.id} req={req} onAccept={accept} onDecline={decline} />)}
            </div>
          )}
        </section>

        {/* Upcoming shifts */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Upcoming shifts</h2>
            {upcoming.length > 0 && (
              <span className="font-mono text-[10px] border border-risk-low/30 bg-risk-low/5 text-risk-low px-2 py-0.5 tabular-nums">
                {upcoming.length} confirmed
              </span>
            )}
          </div>
          {upcoming.length === 0 ? (
            <div className="border border-border bg-card px-6 py-10 flex flex-col items-center gap-2 text-center">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">No upcoming shifts</span>
              <p className="text-sm text-muted-foreground max-w-xs">Accept requests above to confirm your upcoming shifts.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-px">
              {upcoming.map((req) => <RequestCard key={req.id} req={req} onAccept={accept} onDecline={decline} />)}
            </div>
          )}
        </section>

        {/* Past shifts — accepted work whose event date has passed */}
        {past.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Past shifts</h2>
              <span className="font-mono text-[10px] border border-border text-muted-foreground px-2 py-0.5 tabular-nums">
                {past.length}
              </span>
            </div>
            <div className="flex flex-col gap-px">
              {past.map((req) => <RequestCard key={req.id} req={req} onAccept={accept} onDecline={decline} past />)}
            </div>
          </section>
        )}

        {resolved.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Declined</h2>
              <span className="font-mono text-[10px] border border-border text-muted-foreground px-2 py-0.5 tabular-nums">
                {resolved.length}
              </span>
            </div>
            <div className="flex flex-col gap-px">
              {resolved.map((req) => <RequestCard key={req.id} req={req} onAccept={accept} onDecline={decline} />)}
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
