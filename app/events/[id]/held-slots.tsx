"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Timer, X, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CertBadge } from "@/components/CertBadge"
import { formatEventDate } from "@/lib/bookings"

// A slot this organizer is holding for a specific invited medic (status='invited').
// The organizer owns the event, so they can see who they invited; the medic name is
// resolved server-side. No credential PII — display fields only.
export interface HeldSlot {
  id: string
  dateISO: string
  durationHours: number
  hourlyRate: number
  slotIndex: number | null
  expiresAt: string | null
  invitedName: string
  certLevel: string | null
}

// Live countdown to invitation expiry. Mounts blank then ticks each minute so there
// is no server/client time mismatch (this is a "use client" tree). Mono per the
// addendum; the urgency color tracks time-to-expiry, not the slot state.
function Countdown({ expiresAt }: { expiresAt: string | null }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  if (!expiresAt) return null
  if (now === null) return <span className="font-mono text-xs text-muted-foreground tabular-nums">…</span>
  const ms = Date.parse(expiresAt) - now
  if (ms <= 0) return <span className="font-mono text-xs text-risk-high tabular-nums">Expired</span>
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const urgent = ms < 3 * 3_600_000
  return (
    <span className={`font-mono text-xs tabular-nums inline-flex items-center gap-1 ${urgent ? "text-risk-high" : "text-muted-foreground"}`}>
      <Timer className="w-3 h-3" />
      {h > 0 ? `${h}h ${m}m` : `${m}m`}
    </span>
  )
}

export function HeldSlots({ slots }: { slots: HeldSlot[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const rescind = async (bookingId: string) => {
    if (busyId) return
    setBusyId(bookingId)
    setError(null)
    try {
      const res = await fetch("/api/bookings/invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action: "rescind" }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.reason || "Could not rescind the invitation.")
        setBusyId(null)
        return
      }
      // The slot returns to 'open' and reappears under Open slots on refresh.
      router.refresh()
    } catch {
      setError("Network error — please try again.")
      setBusyId(null)
    }
  }

  if (slots.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Held invitations</h2>
        <span className="font-mono text-[10px] border border-border text-muted-foreground px-2 py-0.5 tabular-nums">{slots.length}</span>
      </div>
      <p className="text-sm text-muted-foreground -mt-1">
        Each slot is held for the invited medic until they accept or the invitation expires — meanwhile it stays open to other applicants.
      </p>

      {error && (
        <div className="border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="font-mono text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Held = hueless + diagonal hatch (the pending signal). No hue: green reads as
          complete and is reserved for checked-in. The card is a non-interactive div;
          the only nested <button> is Rescind (persistent, not hover-gated). */}
      <div className="flex flex-col gap-px">
        {slots.map((s) => (
          <div
            key={s.id}
            className="slot-hatch border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4"
          >
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-foreground font-medium leading-tight truncate flex items-center gap-2">
                <span className="truncate">{s.invitedName}</span>
                <CertBadge level={s.certLevel} />
              </span>
              <span className="text-muted-foreground text-xs font-mono tabular-nums inline-flex items-center gap-x-3 gap-y-1 flex-wrap">
                {s.slotIndex != null && <span>Position {s.slotIndex}</span>}
                <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{s.dateISO ? formatEventDate(s.dateISO) : "—"}</span>
                <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{s.durationHours} hrs</span>
                <span>${s.hourlyRate}/hr</span>
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-[10px] uppercase tracking-widest border border-border text-muted-foreground px-2 py-0.5">
                Awaiting medic
              </span>
              <Countdown expiresAt={s.expiresAt} />
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === s.id}
                onClick={() => rescind(s.id)}
                className="rounded-none font-mono text-[10px] uppercase tracking-wider"
              >
                <X className="w-3 h-3 mr-1.5" />
                {busyId === s.id ? "Rescinding…" : "Rescind"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
