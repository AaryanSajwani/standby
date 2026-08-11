"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, ShieldCheck, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"

// Best-effort browser geolocation (never blocks verification — mirrors shift-client).
function getGeo(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    )
  })
}

// Map /api/shifts/verify typed errors to organizer copy.
function verifyErrorCopy(code: string | undefined): string {
  switch (code) {
    case "too_early": return "Check-in opens 60 minutes before the shift."
    case "no_code_yet": return "Ask the medic to open their check-in code first."
    case "invalid_code": return "That code is wrong or expired — ask for the current one."
    case "wrong_phase": return "This shift already moved on — refresh the page."
    case "too_many_attempts": return "Too many tries — wait a minute and retry."
    case "unavailable": return "Verification is temporarily unavailable."
    default: return "Verification failed — ask for the current code and try again."
  }
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

/**
 * Inline on-site check-in: the organizer enters the 6-digit code from the medic's
 * screen without leaving the event page. Same contract as the /shifts/[id]
 * VerifyPanel — POST /api/shifts/verify (the server is authoritative on the 60-min
 * gate, brute-force cap, and status transition). Collapsed by default; expands to a
 * code field. Lives full-width at the bottom of a roster card.
 */
export function CheckInCodeEntry({
  bookingId,
  phase,
  medicName,
  startsAtISO,
}: {
  bookingId: string
  phase: "check_in" | "check_out"
  medicName: string
  startsAtISO: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Client-side view of the 60-min gate (check-in only; server enforces).
  const opensAtMs = phase === "check_in" && startsAtISO ? Date.parse(startsAtISO) - 60 * 60_000 : NaN
  const gated = Number.isFinite(opensAtMs) && Date.now() < opensAtMs
  const label = phase === "check_in" ? "check-in" : "check-out"

  const submit = async () => {
    if (code.length !== 6) {
      setError("Enter the 6-digit code from the medic's screen.")
      return
    }
    setBusy(true)
    setError(null)
    const geo = await getGeo()
    try {
      const res = await fetch("/api/shifts/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, code, phase, ...(geo ?? {}) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.reason || verifyErrorCopy(json?.error))
        setBusy(false)
        return
      }
      // accepted → checked_in, or checked_in → completed. Refresh reflects it.
      router.refresh()
    } catch {
      setError("Network error — please try again.")
      setBusy(false)
    }
  }

  if (gated) {
    return (
      <div className="px-5 pb-4">
        <p className="font-mono text-[10px] tabular-nums text-muted-foreground inline-flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Check-in opens 60 min before the shift — at {fmtTime(opensAtMs)}
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="px-5 pb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
          className="rounded-none font-mono text-[10px] uppercase tracking-wider"
        >
          <KeyRound className="w-3 h-3 mr-1.5" />
          Enter {label} code
        </Button>
      </div>
    )
  }

  return (
    <div className="border-t border-border px-5 py-4 flex flex-col gap-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {phase === "check_in" ? `Check ${medicName} in on site` : `Check ${medicName} out`}
      </span>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="h-11 w-full sm:w-44 px-3 bg-input border border-input-border text-foreground font-mono text-2xl tabular-nums tracking-[0.3em] text-center focus:outline-none focus:border-primary"
        />
        <div className="flex items-center gap-2">
          <Button
            disabled={busy || code.length !== 6}
            onClick={submit}
            className="rounded-none font-mono text-[10px] uppercase tracking-wider h-11"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
            {busy ? "Verifying…" : phase === "check_in" ? "Verify check-in" : "Verify check-out"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => { setOpen(false); setCode(""); setError(null) }}
            className="rounded-none font-mono text-[10px] uppercase tracking-wider h-11"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      {error && <p className="font-mono text-xs text-destructive">{error}</p>}
      <p className="font-mono text-[10px] text-muted-foreground">
        The medic shows a rotating 6-digit code on their shift screen — codes change every 60s, use the one showing now.
      </p>
    </div>
  )
}
