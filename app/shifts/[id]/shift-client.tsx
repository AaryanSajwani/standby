"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ShieldCheck, Clock, AlertTriangle, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { validateReviewText, MAX_REVIEW_LENGTH } from "@/lib/reviews/content-guard"
import { dimensionsFor } from "@/lib/reviews/dimensions"

export interface ShiftReview {
  id: string
  overall: number
  subscores: Record<string, number>
  body: string | null
  status: string
}

interface ShiftClientProps {
  bookingId: string
  viewerRole: "organizer" | "emt"
  status: string
  counterpartName: string
  myReview: ShiftReview | null
  counterpartReview: ShiftReview | null
}

// Best-effort browser geolocation (never blocks check-in).
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

// ── Medic: rotating check-in code ────────────────────────────────────────────
function CheckInCodePanel({ bookingId, phase }: { bookingId: string; phase: "check_in" | "check_out" }) {
  const router = useRouter()
  const [code, setCode] = useState<string | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fetchCode = useCallback(async () => {
    try {
      const res = await fetch("/api/shifts/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      })
      if (res.status === 409) {
        // Status advanced (organizer verified) → reflect the new state.
        router.refresh()
        return
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.reason || "Could not load your check-in code.")
        return
      }
      setCode(json.code)
      setRemaining(Math.max(0, Math.floor(json.secondsRemaining)))
      setError(null)
    } catch {
      setError("Network error — retrying…")
    }
  }, [bookingId, router])

  useEffect(() => {
    void fetchCode()
    const tick = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          void fetchCode()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [fetchCode])

  const pretty = code ? `${code.slice(0, 3)} ${code.slice(3)}` : "— — —"

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {phase === "check_in" ? "Your check-in code" : "Your check-out code"}
        </h2>
      </div>
      <div className="border border-border bg-card px-6 py-8 flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Show this to the organizer on site — they enter it to {phase === "check_in" ? "check you in" : "check you out"}. It rotates every 60 seconds.
        </p>
        <span className="font-mono text-5xl md:text-6xl font-bold tabular-nums tracking-widest text-foreground">{pretty}</span>
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground tabular-nums">
          <Clock className="w-3 h-3" />
          {code ? `Rotates in ${remaining}s` : "Loading…"}
        </div>
        {error && <p className="font-mono text-xs text-destructive">{error}</p>}
      </div>
    </section>
  )
}

// ── Organizer: verify the medic's code ───────────────────────────────────────
function VerifyPanel({ bookingId, phase, counterpartName }: { bookingId: string; phase: "check_in" | "check_out"; counterpartName: string }) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (code.length !== 6) return setError("Enter the 6-digit code from the medic's screen.")
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
        setError(json?.reason || "Verification failed. Ask for the current code and try again.")
        setBusy(false)
        return
      }
      router.refresh()
    } catch {
      setError("Network error — please try again.")
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {phase === "check_in" ? "Verify medic on site" : "Verify check-out"}
      </h2>
      <div className="border border-border bg-card px-6 py-6 flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from {counterpartName}&apos;s screen to {phase === "check_in" ? "confirm they're on site" : "close out the shift"}.
        </p>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="w-full h-14 px-4 bg-input border border-input-border text-foreground font-mono text-3xl tabular-nums tracking-[0.3em] text-center focus:outline-none focus:border-primary"
        />
        {error && <p className="font-mono text-xs text-destructive">{error}</p>}
        <Button disabled={busy || code.length !== 6} onClick={submit} className="rounded-none font-mono text-xs uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
          {busy ? "Verifying…" : phase === "check_in" ? "Verify check-in" : "Verify check-out"}
        </Button>
        <p className="font-mono text-[10px] text-muted-foreground text-center">Codes expire every 60s — use the one showing now.</p>
      </div>
    </section>
  )
}

// ── Score selector (1–5, bar-fill) ───────────────────────────────────────────
function ScoreSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} of 5`}
          className={cn(
            "w-8 h-8 border font-mono text-xs tabular-nums flex items-center justify-center transition-colors",
            value >= n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function StaticStars({ overall }: { overall: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("w-3.5 h-3.5", overall >= n ? "text-primary fill-primary" : "text-border")} />
      ))}
    </span>
  )
}

// ── Reviews (double-blind) ───────────────────────────────────────────────────
function ReviewSection({
  bookingId,
  viewerRole,
  counterpartName,
  myReview,
  counterpartReview,
}: {
  bookingId: string
  viewerRole: "organizer" | "emt"
  counterpartName: string
  myReview: ShiftReview | null
  counterpartReview: ShiftReview | null
}) {
  const router = useRouter()
  const dims = dimensionsFor(viewerRole)
  const [overall, setOverall] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phiConfirm, setPhiConfirm] = useState(false) // medic PHI interstitial gate

  const setScore = (k: string, v: number) => setScores((s) => ({ ...s, [k]: v }))

  const allRated = overall >= 1 && dims.every((d) => (scores[d.key] ?? 0) >= 1)

  const submit = async () => {
    setError(null)
    const check = validateReviewText(text, viewerRole)
    if (!check.ok) return setError(check.errors[0])
    // PHI interstitial for the medic — warn once, require confirmation.
    if (viewerRole === "emt" && check.warnings.length > 0 && !phiConfirm) {
      setPhiConfirm(true)
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, overall, subscores: scores, body: text }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.errors?.[0] || json?.reason || "Could not submit your review.")
        setBusy(false)
        return
      }
      router.refresh()
    } catch {
      setError("Network error — please try again.")
      setBusy(false)
    }
  }

  const subjectLabel = viewerRole === "organizer" ? "medic" : "organizer"

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Reviews</h2>

      {/* Your review */}
      {myReview ? (
        <div className="border border-border bg-card px-5 py-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Your review of the {subjectLabel}</span>
            <span className={cn(
              "font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5",
              myReview.status === "published" ? "border-risk-low/30 bg-risk-low/5 text-risk-low" : "border-risk-medium/30 bg-risk-medium/5 text-risk-medium"
            )}>
              {myReview.status === "published" ? "Published" : "Awaiting reveal"}
            </span>
          </div>
          <StaticStars overall={myReview.overall} />
          {myReview.body && <p className="text-sm text-muted-foreground leading-relaxed">{myReview.body}</p>}
          {myReview.status !== "published" && (
            <p className="font-mono text-[10px] text-muted-foreground">
              Hidden from {counterpartName} until they submit theirs (or 14 days pass) — then both reveal together.
            </p>
          )}
        </div>
      ) : (
        <div className="border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Rate the {subjectLabel}</span>
          </div>

          {viewerRole === "emt" && (
            <div className="mx-5 mt-4 border border-risk-medium/30 bg-risk-medium/5 px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-risk-medium shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Do not include patient information, medical details, or descriptions of care provided. Reviews are public.
              </p>
            </div>
          )}

          <div className="px-5 py-5 flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <label className="font-mono text-[10px] uppercase tracking-widest text-foreground">Overall</label>
              <ScoreSelect value={overall} onChange={setOverall} />
            </div>
            <Separator />
            {dims.map((d) => (
              <div key={d.key} className="flex items-center justify-between gap-4">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{d.label}</label>
                <ScoreSelect value={scores[d.key] ?? 0} onChange={(v) => setScore(d.key, v)} />
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Comments <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setPhiConfirm(false) }}
                maxLength={MAX_REVIEW_LENGTH}
                rows={3}
                placeholder="Logistics, communication, site — keep it about the working relationship."
                className="w-full px-3 py-2.5 bg-input border border-input-border text-foreground placeholder:text-placeholder font-mono text-sm resize-none focus:outline-none focus:border-primary"
              />
              <span className="font-mono text-[10px] text-muted-foreground text-right tabular-nums">{text.length}/{MAX_REVIEW_LENGTH}</span>
            </div>

            {error && <p className="font-mono text-xs text-destructive">{error}</p>}

            {phiConfirm && (
              <div className="border border-risk-medium/40 bg-risk-medium/5 px-4 py-3 flex flex-col gap-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This may describe a patient or care provided. Confirm your review contains no patient information before submitting.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={submit} disabled={busy} className="rounded-none font-mono text-[10px] uppercase tracking-wider">
                    It&apos;s clear — submit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPhiConfirm(false)} className="rounded-none font-mono text-[10px] uppercase tracking-wider">
                    Edit review
                  </Button>
                </div>
              </div>
            )}

            {!phiConfirm && (
              <Button disabled={!allRated || busy} onClick={submit} className="rounded-none font-mono text-xs uppercase tracking-wider self-start">
                <Check className="w-3.5 h-3.5 mr-1.5" />
                {busy ? "Submitting…" : "Submit review"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Counterpart review — only when published */}
      {counterpartReview ? (
        <div className="border border-border bg-card px-5 py-4 flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{counterpartName}&apos;s review</span>
          <StaticStars overall={counterpartReview.overall} />
          {counterpartReview.body && <p className="text-sm text-muted-foreground leading-relaxed">{counterpartReview.body}</p>}
        </div>
      ) : (
        <p className="font-mono text-[10px] text-muted-foreground">
          {counterpartName}&apos;s review stays hidden until you both submit (or the 14-day window closes).
        </p>
      )}
    </section>
  )
}

export function ShiftClient({ bookingId, viewerRole, status, counterpartName, myReview, counterpartReview }: ShiftClientProps) {
  // Check-in / check-out phase from the current booking status.
  const phase: "check_in" | "check_out" | null =
    status === "accepted" ? "check_in" : status === "checked_in" ? "check_out" : null

  if (status === "completed") {
    return (
      <ShiftClientCompleted
        bookingId={bookingId}
        viewerRole={viewerRole}
        counterpartName={counterpartName}
        myReview={myReview}
        counterpartReview={counterpartReview}
      />
    )
  }

  if (phase) {
    return (
      <div className="flex flex-col gap-8">
        <StatusRail status={status} />
        {viewerRole === "emt" ? (
          <CheckInCodePanel bookingId={bookingId} phase={phase} />
        ) : (
          <VerifyPanel bookingId={bookingId} phase={phase} counterpartName={counterpartName} />
        )}
      </div>
    )
  }

  // pending / open / declined / cancelled — nothing to do on the shift page.
  return (
    <div className="border border-border bg-card px-6 py-8 text-center">
      <p className="text-sm text-muted-foreground">
        {status === "pending"
          ? "This shift is awaiting the medic's response."
          : status === "open"
          ? "This is an open slot — accept an applicant from the event page."
          : "This shift isn't active."}
      </p>
    </div>
  )
}

function ShiftClientCompleted(props: {
  bookingId: string
  viewerRole: "organizer" | "emt"
  counterpartName: string
  myReview: ShiftReview | null
  counterpartReview: ShiftReview | null
}) {
  return (
    <div className="flex flex-col gap-8">
      <StatusRail status="completed" />
      <ReviewSection {...props} />
    </div>
  )
}

// Simple lifecycle rail so both parties can see where the shift is.
function StatusRail({ status }: { status: string }) {
  const steps = [
    { key: "accepted", label: "Confirmed" },
    { key: "checked_in", label: "Checked in" },
    { key: "completed", label: "Completed" },
  ]
  const order = ["accepted", "checked_in", "completed"]
  const currentIdx = order.indexOf(status)
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = currentIdx >= i
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex items-center gap-2 pr-3">
              <span className={cn("w-2 h-2", done ? "bg-risk-low" : "bg-border")} />
              <span className={cn("font-mono text-[10px] uppercase tracking-widest", done ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className="w-6 h-px bg-border mr-3" />}
          </div>
        )
      })}
    </div>
  )
}
