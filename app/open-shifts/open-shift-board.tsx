"use client"

import { useState } from "react"
import Link from "next/link"
import { Calendar, MapPin, Users, Clock, Check, X, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export interface OpenShift {
  id: string
  eventName: string
  eventType: string
  date: string
  location: string
  attendance: number
  durationHours: number
  hourlyRate: number
  notes: string | null
  /** The viewer's own application on this slot, if any. */
  applicationId: string | null
  applicationStatus: "applied" | "accepted" | "rejected" | "withdrawn" | "expired" | null
}

interface OpenShiftBoardProps {
  viewerId: string
  verified: boolean
  shifts: OpenShift[]
}

export function OpenShiftBoard({ viewerId, verified, shifts: initial }: OpenShiftBoardProps) {
  const [shifts, setShifts] = useState<OpenShift[]>(initial)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Optional message, keyed by shift id while its compose box is open.
  const [composing, setComposing] = useState<string | null>(null)
  const [message, setMessage] = useState("")

  const patch = (id: string, next: Partial<OpenShift>) =>
    setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...next } : s)))

  const apply = async (shift: OpenShift) => {
    setBusyId(shift.id)
    setError(null)
    const supabase = createClient()
    // booking_applications applicant insert (0011): verified EMT, status
    // 'applied', booking must be open and not the medic's own event. The SELECT
    // visibility from 0012 is what lets the policy's EXISTS check pass.
    const { data, error: insertError } = await supabase
      .from("booking_applications")
      .insert({ booking_id: shift.id, emt_id: viewerId, message: message.trim() || null })
      .select("id")
      .single()
    if (insertError) {
      setError(insertError.message)
      setBusyId(null)
      return
    }
    patch(shift.id, { applicationId: data.id, applicationStatus: "applied" })
    setComposing(null)
    setMessage("")
    setBusyId(null)
  }

  const withdraw = async (shift: OpenShift) => {
    if (!shift.applicationId) return
    setBusyId(shift.id)
    setError(null)
    const supabase = createClient()
    // Guard trigger (0011) allows only applied → withdrawn from the client.
    const { error: updErr } = await supabase
      .from("booking_applications")
      .update({ status: "withdrawn" })
      .eq("id", shift.applicationId)
    if (updErr) {
      setError(updErr.message)
      setBusyId(null)
      return
    }
    patch(shift.id, { applicationStatus: "withdrawn" })
    setBusyId(null)
  }

  if (shifts.length === 0) {
    return (
      <div className="border border-border bg-card px-6 py-12 flex flex-col items-center gap-2 text-center">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">No open shifts right now</span>
        <p className="text-sm text-muted-foreground max-w-sm">
          When organizers post open coverage, it&apos;ll show up here. Check back soon.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {!verified && (
        <div className="border border-risk-medium/40 bg-risk-medium/5 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-risk-medium shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs uppercase tracking-widest text-risk-medium">Verification pending</span>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can browse open shifts now, but requesting one is enabled once your credentials are verified — usually 1–2 business days.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="border border-destructive/30 bg-destructive/5 px-5 py-3">
          <p className="font-mono text-xs text-destructive">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-px">
        {shifts.map((s) => {
          const applied = s.applicationStatus === "applied"
          const terminal = s.applicationStatus === "withdrawn" || s.applicationStatus === "rejected" || s.applicationStatus === "expired"
          const est = Math.round(s.hourlyRate * s.durationHours)
          return (
            <div key={s.id} className="border border-border bg-card flex flex-col">
              <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-foreground font-medium text-base leading-tight truncate">{s.eventName}</span>
                  <span className="text-muted-foreground text-xs font-mono">{s.eventType}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-xl tabular-nums font-bold text-foreground">${s.hourlyRate}</span>
                    <span className="font-mono text-xs text-muted-foreground">/hr</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums">${est.toLocaleString()} est.</span>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-y md:divide-y-0 divide-border">
                {[
                  { icon: <Calendar className="w-3 h-3" />, label: "Date", value: s.date },
                  { icon: <MapPin className="w-3 h-3" />, label: "Location", value: s.location },
                  { icon: <Users className="w-3 h-3" />, label: "Attendance", value: s.attendance.toLocaleString() },
                  { icon: <Clock className="w-3 h-3" />, label: "Duration", value: `${s.durationHours} hrs` },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex flex-col gap-1 px-4 py-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
                    <span className="font-mono text-sm tabular-nums text-foreground truncate">{value}</span>
                  </div>
                ))}
              </div>

              {s.notes && (
                <>
                  <Separator />
                  <div className="px-5 py-4">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Notes from organizer</span>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">{s.notes}</p>
                  </div>
                </>
              )}

              <Separator />

              <div className="px-5 py-4 flex flex-col gap-3">
                {/* Optional message compose */}
                {composing === s.id && (
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Optional note to the organizer (relevant experience, availability confirmation…)"
                    maxLength={1000}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-input border border-input-border text-foreground placeholder:text-placeholder font-mono text-sm resize-none focus:outline-none focus:border-primary"
                  />
                )}

                <div className="flex items-center justify-between gap-3">
                  {applied ? (
                    <span className="font-mono text-[10px] uppercase tracking-widest border border-risk-low/30 bg-risk-low/5 text-risk-low px-2 py-0.5">
                      Requested
                    </span>
                  ) : terminal ? (
                    <span className="font-mono text-[10px] uppercase tracking-widest border border-border text-muted-foreground px-2 py-0.5">
                      {s.applicationStatus === "withdrawn" ? "Withdrawn" : s.applicationStatus === "rejected" ? "Not selected" : "Expired"}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Open for requests</span>
                  )}

                  <div className="flex items-center gap-2">
                    {applied ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === s.id}
                        onClick={() => withdraw(s)}
                        className="rounded-none font-mono text-[10px] uppercase tracking-wider"
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        {busyId === s.id ? "Withdrawing…" : "Withdraw request"}
                      </Button>
                    ) : !terminal && verified ? (
                      composing === s.id ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => { setComposing(null); setMessage("") }} className="rounded-none font-mono text-[10px] uppercase tracking-wider">
                            Cancel
                          </Button>
                          <Button size="sm" disabled={busyId === s.id} onClick={() => apply(s)} className="rounded-none font-mono text-[10px] uppercase tracking-wider">
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                            {busyId === s.id ? "Sending…" : "Send request"}
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => setComposing(s.id)} className="rounded-none font-mono text-[10px] uppercase tracking-wider">
                          Request to fill
                        </Button>
                      )
                    ) : !terminal && !verified ? (
                      <Link href="/emt-dashboard" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none font-mono text-[10px] uppercase tracking-wider")}>
                        Finish verification
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
