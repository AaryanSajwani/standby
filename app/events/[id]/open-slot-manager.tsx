"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Check, Users, Clock, MapPin, Calendar, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CERT_DISPLAY } from "@/lib/emt"
import { formatEventDate, type Applicant } from "@/lib/bookings"

export interface OpenSlot {
  id: string
  dateISO: string
  durationHours: number
  hourlyRate: number
  notes: string | null
  applicants: Applicant[]
}

interface OpenSlotManagerProps {
  eventId: string
  viewerId: string
  /** Prefill for a newly posted slot — carried from the event row. */
  event: {
    name: string
    eventType: string
    eventDate: string | null
    venueAddress: string | null
    expectedAttendance: number | null
  }
  openSlots: OpenSlot[]
}

export function OpenSlotManager({ eventId, viewerId, event, openSlots }: OpenSlotManagerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  // Prefilled from the event; editable so an organizer can post a slot even when
  // the event row is sparse (event_date / attendance are nullable).
  const [eventDate, setEventDate] = useState(event.eventDate ?? "")
  const [location, setLocation] = useState(event.venueAddress ?? "")
  const [attendance, setAttendance] = useState(
    event.expectedAttendance ? String(event.expectedAttendance) : ""
  )
  const [duration, setDuration] = useState("")
  const [rate, setRate] = useState("")
  const [notes, setNotes] = useState("")

  const durationNum = Number(duration)
  const rateNum = Number(rate)
  const valid =
    eventDate &&
    location.trim() &&
    Number(attendance) > 0 &&
    durationNum > 0 &&
    rateNum > 0

  const post = async () => {
    if (!valid) return
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    // organizer_insert_open_slot (migration 0011): status must be 'open',
    // emt_id null, and the event must belong to the caller.
    const { error: insertError } = await supabase.from("bookings").insert({
      organizer_id: viewerId,
      emt_id: null,
      event_id: eventId,
      event_name: event.name,
      event_type: event.eventType,
      event_date: eventDate,
      location: location.trim(),
      expected_attendance: Number(attendance),
      duration_hours: durationNum,
      offered_rate: rateNum,
      notes: notes.trim() || null,
      status: "open",
    })
    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setOpen(false)
    setDuration("")
    setRate("")
    setNotes("")
    router.refresh()
  }

  const accept = async (applicationId: string) => {
    setAcceptingId(applicationId)
    setError(null)
    try {
      const res = await fetch("/api/bookings/accept-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.reason || json?.error || "Could not accept this applicant.")
        setAcceptingId(null)
        return
      }
      router.refresh()
    } catch {
      setError("Network error — please try again.")
      setAcceptingId(null)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Open slots</h2>
          {openSlots.length > 0 && (
            <span className="font-mono text-[10px] border border-primary/30 bg-primary/5 text-primary px-2 py-0.5 tabular-nums">
              {openSlots.length}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen((o) => !o)}
          className="rounded-none font-mono text-[10px] uppercase tracking-wider"
        >
          {open ? <><X className="w-3 h-3 mr-1.5" />Cancel</> : <><Plus className="w-3 h-3 mr-1.5" />Post open slot</>}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground -mt-1">
        Post a slot with no medic assigned — verified EMTs can request to fill it, and you choose who to accept.
      </p>

      {error && (
        <div className="border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="font-mono text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Post form */}
      {open && (
        <div className="border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">New open slot</span>
          </div>
          <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Event date <span className="text-primary">*</span>
              </label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="rounded-none font-mono text-sm h-10" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Location <span className="text-primary">*</span>
              </label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Chicago, IL" className="rounded-none font-mono text-sm h-10" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Expected attendance <span className="text-primary">*</span>
              </label>
              <Input type="number" min={1} value={attendance} onChange={(e) => setAttendance(e.target.value)} placeholder="800" className="rounded-none font-mono text-sm h-10" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Duration (hours) <span className="text-primary">*</span>
              </label>
              <Input type="number" min={0.5} max={72} step={0.5} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="8" className="rounded-none font-mono text-sm h-10" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Offered rate ($/hr) <span className="text-primary">*</span>
              </label>
              <Input type="number" min={1} max={500} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="45" className="rounded-none font-mono text-sm h-10" />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Notes <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Site details, arrival time, on-site contact…"
                maxLength={600}
                rows={2}
                className="w-full px-3 py-2.5 bg-input border border-input-border text-foreground placeholder:text-placeholder font-mono text-sm resize-none focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="border-t border-border px-5 py-4 flex justify-end">
            <Button disabled={!valid || submitting} onClick={post} className="rounded-none font-mono text-xs uppercase tracking-wider">
              {submitting ? "Posting…" : "Post open slot"}
            </Button>
          </div>
        </div>
      )}

      {/* Open slots + applicants */}
      {openSlots.length === 0 && !open ? (
        <div className="border border-border bg-card px-6 py-8 flex flex-col items-center gap-2 text-center">
          <Users className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-sm">No open slots posted. Post one to let verified EMTs apply.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-px">
          {openSlots.map((slot) => {
            const pending = slot.applicants.filter((a) => a.status === "applied")
            return (
              <div key={slot.id} className="border border-border bg-card flex flex-col">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest border border-primary/30 bg-primary/5 text-primary px-2 py-0.5">Open slot</span>
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground tabular-nums">
                    <Calendar className="w-3 h-3" />{slot.dateISO ? formatEventDate(slot.dateISO) : "—"}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground tabular-nums">
                    <Clock className="w-3 h-3" />{slot.durationHours} hrs
                  </span>
                  <span className="font-mono text-xs text-foreground tabular-nums">${slot.hourlyRate}/hr</span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
                    {pending.length} {pending.length === 1 ? "applicant" : "applicants"}
                  </span>
                </div>

                {pending.length > 0 && <Separator />}

                {pending.map((a) => (
                  <div key={a.applicationId} className="border-t border-border first:border-t-0 flex flex-col md:flex-row md:items-center gap-3 px-5 py-4">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground font-medium leading-tight truncate">{a.emtName}</span>
                        {a.certLevel && (
                          <span className="font-mono text-[10px] uppercase tracking-widest border border-border text-muted-foreground px-1.5 py-0.5">
                            {CERT_DISPLAY[a.certLevel] ?? a.certLevel}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground tabular-nums inline-flex items-center gap-2 flex-wrap">
                        {a.hourlyRate != null && <span>Posted rate ${a.hourlyRate}/hr</span>}
                        {(a.city || a.state) && (
                          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{[a.city, a.state].filter(Boolean).join(", ")}</span>
                        )}
                      </span>
                      {a.message && <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{a.message}</p>}
                    </div>
                    <Button
                      size="sm"
                      disabled={acceptingId !== null}
                      onClick={() => accept(a.applicationId)}
                      className="rounded-none font-mono text-[10px] uppercase tracking-wider shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      {acceptingId === a.applicationId ? "Accepting…" : "Accept"}
                    </Button>
                  </div>
                ))}

                {pending.length === 0 && (
                  <div className="border-t border-border px-5 py-4">
                    <p className="text-sm text-muted-foreground">No applicants yet — verified EMTs will see this on the open-shift board.</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
