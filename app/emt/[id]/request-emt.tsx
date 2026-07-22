"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { BOOKING_PREFILL_KEY, type BookingPrefill } from "@/lib/assessment"
import { findOrCreateEvent } from "@/lib/events"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const EVENT_TYPES = [
  "Concert",
  "Festival",
  "Sporting event",
  "Corporate event",
  "Film & TV",
  "Private event",
  "Other",
]

interface RequestEmtProps {
  emtId: string
  emtName: string
  hourlyRate: number
  available: boolean
  viewerId: string | null
}

export function RequestEmt({ emtId, emtName, hourlyRate, available, viewerId }: RequestEmtProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [eventName, setEventName] = useState("")
  const [eventType, setEventType] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [location, setLocation] = useState("")
  const [attendance, setAttendance] = useState("")
  const [duration, setDuration] = useState("")
  const [notes, setNotes] = useState("")
  // Carried from a saved assessment when present; otherwise the booking
  // find-or-creates the event on submit. Never shown in the form.
  const [eventId, setEventId] = useState<string | null>(null)

  // Prefill from a completed assessment (set by Request Staffing on /results)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(BOOKING_PREFILL_KEY)
      if (!raw) return
      const p = JSON.parse(raw) as Partial<BookingPrefill>
      if (p.eventName) setEventName(p.eventName)
      if (p.eventType && EVENT_TYPES.includes(p.eventType)) setEventType(p.eventType)
      if (p.eventDate) setEventDate(p.eventDate)
      if (p.location) setLocation(p.location)
      if (p.attendance) setAttendance(p.attendance)
      if (p.durationHours) setDuration(p.durationHours)
      if (p.notes) setNotes(p.notes)
      if (p.eventId) setEventId(p.eventId)
      if (viewerId && available) setOpen(true)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const durationNum = Number(duration)
  const estimatedTotal = durationNum > 0 ? Math.round(durationNum * hourlyRate) : 0

  const valid =
    eventName.trim() &&
    eventType &&
    eventDate &&
    location.trim() &&
    Number(attendance) > 0 &&
    durationNum > 0

  const handleSubmit = async () => {
    if (!viewerId) return
    setSubmitting(true)
    setError(null)
    const supabase = createClient()

    // Use the event id carried from a saved assessment; otherwise find-or-create
    // it now (cold path: organizer requested coverage without saving a report)
    // so the booking still rolls up to /events/[id] by id, not by name.
    let bookingEventId = eventId
    if (!bookingEventId) {
      bookingEventId = await findOrCreateEvent(supabase, {
        organizerId: viewerId,
        name: eventName.trim(),
        eventType,
        eventDate,
        venueAddress: location.trim(),
        expectedAttendance: Number(attendance),
      })
    }

    const { data: created, error: insertError } = await supabase
      .from("bookings")
      .insert({
        organizer_id: viewerId,
        emt_id: emtId,
        event_id: bookingEventId,
        event_name: eventName.trim(),
        event_type: eventType,
        event_date: eventDate,
        location: location.trim(),
        expected_attendance: Number(attendance),
        duration_hours: durationNum,
        offered_rate: hourlyRate,
        notes: notes.trim() || null,
      })
      .select("id")
      .single()

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }
    // Best-effort email to the EMT — the server rebuilds content from the DB
    // row, so this only names the booking. Failure never blocks the request.
    if (created?.id) {
      void fetch("/api/notifications/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: created.id, event: "requested" }),
      }).catch(() => {})
    }
    try {
      sessionStorage.removeItem(BOOKING_PREFILL_KEY)
    } catch {}
    setSent(true)
  }

  // Not signed in → send to auth, return here after
  if (!viewerId) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href={`/auth?role=organizer&next=/emt/${emtId}`}
          className={cn(buttonVariants(), "font-mono text-xs tracking-wider uppercase px-8")}
        >
          Request coverage
        </Link>
        <Link href="/personnel" className={cn(buttonVariants({ variant: "outline" }), "font-mono text-xs tracking-wider uppercase")}>
          Browse more personnel
        </Link>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="border border-risk-low/30 bg-risk-low/5 px-5 py-4 flex items-start gap-3">
        <Check className="w-4 h-4 text-risk-low shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-widest text-risk-low">Request sent</span>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your request is now in {emtName}&apos;s queue — they&apos;ll see it on their dashboard and can
            accept or decline. Track the status on your{" "}
            <Link href="/events" className="text-foreground underline underline-offset-2">events page</Link>
            {" "}— you&apos;ll get an email when they respond.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          disabled={!available}
          onClick={() => setOpen((o) => !o)}
          className="font-mono text-xs tracking-wider uppercase px-8"
        >
          {available ? (open ? "Close request form" : "Request coverage") : "Currently unavailable"}
        </Button>
        <Link href="/personnel" className={cn(buttonVariants({ variant: "outline" }), "font-mono text-xs tracking-wider uppercase")}>
          Browse more personnel
        </Link>
      </div>

      {open && available && (
        <div className="border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Coverage request</span>
            <h2 className="text-foreground text-lg font-semibold mt-1">Request {emtName}</h2>
          </div>

          {error && (
            <div className="mx-5 mt-4 border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="font-mono text-xs text-destructive">{error}</p>
            </div>
          )}

          <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Event name <span className="text-primary">*</span>
              </label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Lakeview Summer Festival"
                className="rounded-none font-mono text-sm h-10"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Event type <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full h-10 px-3 pr-10 bg-input border border-input-border text-foreground font-mono text-sm appearance-none focus:outline-none focus:border-primary"
                >
                  <option value="">Select…</option>
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-popover">{t}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Event date <span className="text-primary">*</span>
              </label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="rounded-none font-mono text-sm h-10"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Location <span className="text-primary">*</span>
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Chicago, IL"
                className="rounded-none font-mono text-sm h-10"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Expected attendance <span className="text-primary">*</span>
              </label>
              <Input
                type="number"
                min={1}
                value={attendance}
                onChange={(e) => setAttendance(e.target.value)}
                placeholder="800"
                className="rounded-none font-mono text-sm h-10"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Duration (hours) <span className="text-primary">*</span>
              </label>
              <Input
                type="number"
                min={1}
                max={24}
                step={0.5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="8"
                className="rounded-none font-mono text-sm h-10"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Notes{" "}
                <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Site details, arrival time, on-site contact, nearest hospital…"
                maxLength={600}
                rows={3}
                className="w-full px-3 py-2.5 bg-input border border-input-border text-foreground placeholder:text-placeholder font-mono text-sm resize-none focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Estimate + submit */}
          <div className="border-t border-border px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Estimated total</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-2xl tabular-nums font-bold text-foreground">
                  ${estimatedTotal.toLocaleString()}
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {durationNum > 0 ? `${durationNum} hrs × $${hourlyRate}/hr` : `at $${hourlyRate}/hr`}
                </span>
              </div>
            </div>
            <Button
              disabled={!valid || submitting}
              onClick={handleSubmit}
              className="rounded-none font-mono text-xs uppercase tracking-wider"
            >
              {submitting ? "Sending…" : "Send request"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
