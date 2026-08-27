"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ShieldCheck, Clock, AlertTriangle, Star, Camera, Pencil, QrCode, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { validateReviewText, MAX_REVIEW_LENGTH } from "@/lib/reviews/content-guard"
import { dimensionsFor } from "@/lib/reviews/dimensions"
import { ReportReviewButton } from "@/components/reviews/ReportReviewButton"

export interface ShiftReview {
  id: string
  overall: number
  subscores: Record<string, number>
  body: string | null
  status: string
  published_at: string | null
  edited_at: string | null
}

export interface ShiftReply {
  id: string
  review_id: string
  author_user_id: string
  body: string
  edited_at: string | null
  created_at: string
}

interface ShiftClientProps {
  bookingId: string
  viewerRole: "organizer" | "emt"
  viewerId: string
  status: string
  startsAtISO: string | null
  offeredRate: number
  counterpartName: string
  myReview: ShiftReview | null
  counterpartReview: ShiftReview | null
  replyToMyReview: ShiftReply | null
  myReplyToTheirReview: ShiftReply | null
}

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

function fmtTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
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

// ── QR primitives (check-in): medic shows, organizer scans ────────────────────
// The QR encodes the SAME rotating 6-digit code the medic already displays — the
// scanner is just a faster input path into /api/shifts/verify, not a new trust
// path. Both libs are dynamically imported so they stay out of the initial bundle.

// Renders `value` as a QR on a white tile (QR needs a light background + quiet
// zone to scan — same reason the navy logo mark sits on a light tile).
function QrCodeImage({ value, size = 168 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const QR = (await import("qrcode")).default
        const url = await QR.toDataURL(value, {
          margin: 2,
          width: size * 2, // 2× so it stays crisp on hi-dpi phone screens
          color: { dark: "#000000", light: "#ffffff" },
          errorCorrectionLevel: "M",
        })
        if (alive) setSrc(url)
      } catch {
        if (alive) setSrc(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [value, size])
  return (
    <div className="bg-white border border-border p-3" style={{ width: size + 24 }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL, next/image adds nothing
        <img src={src} alt="Check-in QR code" width={size} height={size} className="block w-full h-auto" />
      ) : (
        <div className="bg-muted" style={{ width: size, height: size }} />
      )}
    </div>
  )
}

// Organizer camera scanner. Opens the rear camera, decodes the medic's QR with
// jsQR, and hands the 6-digit code to onDecode. Access is gated by the browser
// prompt + Permissions-Policy camera=(self); it always cleans up the stream on
// unmount/stop, and surfaces a clear message so the caller's manual entry stays
// the fallback when the camera is blocked or unsupported.
function QrScanner({ onDecode, onClose }: { onDecode: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const doneRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d", { willReadFrequently: true })

    const stop = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    const scan = async () => {
      const jsQR = (await import("jsqr")).default
      const tick = () => {
        if (cancelled || doneRef.current) return
        const video = videoRef.current
        if (video && video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const found = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" })
          const digits = found?.data.replace(/\D/g, "") ?? ""
          if (digits.length >= 6) {
            doneRef.current = true
            stop()
            onDecode(digits.slice(0, 6))
            return
          }
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    void (async () => {
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          setError("This browser can't open the camera — enter the code by hand.")
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => {})
        }
        void scan()
      } catch {
        setError("Camera access was blocked. Allow it in your browser, or enter the code by hand.")
      }
    })()

    return () => {
      cancelled = true
      stop()
    }
  }, [onDecode])

  return (
    <div className="flex flex-col gap-3">
      <div className="relative bg-black border border-border w-full max-w-[280px] mx-auto aspect-square overflow-hidden">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        <div className="pointer-events-none absolute inset-6 border-2 border-white/70" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scanner"
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-black/60 text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground text-center">Point the camera at the medic&apos;s check-in QR code.</p>
      {error && <p className="font-mono text-xs text-destructive text-center">{error}</p>}
    </div>
  )
}

// ── Medic: rotating check-in code (with 60-min gate + self-attest fallback) ───
function CheckInCodePanel({
  bookingId,
  viewerId,
  phase,
}: {
  bookingId: string
  viewerId: string
  phase: "check_in" | "check_out"
}) {
  const router = useRouter()
  const [code, setCode] = useState<string | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [error, setError] = useState<string | null>(null)
  // Time gate: before the 60-min window there's no live code — show a countdown.
  const [tooEarly, setTooEarly] = useState(false)
  const [opensAt, setOpensAt] = useState<string | null>(null)
  // Self-attest fallback availability (30 min past start with no verification).
  const [selfAttestOpen, setSelfAttestOpen] = useState(false)

  const fetchCode = useCallback(async () => {
    try {
      const res = await fetch("/api/shifts/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 409 && json?.error === "too_early") {
        // Not in the check-in window yet — count down to when it opens.
        setTooEarly(true)
        setOpensAt(json.opensAt ?? null)
        setSelfAttestOpen(Boolean(json.selfAttestOpen))
        setCode(null)
        setError(null)
        const opensMs = json.opensAt ? Date.parse(json.opensAt) : NaN
        setRemaining(Number.isFinite(opensMs) ? Math.max(0, Math.floor((opensMs - Date.now()) / 1000)) : 0)
        return
      }
      if (res.status === 409) {
        // Status advanced (organizer verified) → reflect the new state.
        router.refresh()
        return
      }
      if (!res.ok) {
        setError(json?.reason || "Could not load your check-in code.")
        return
      }
      setTooEarly(false)
      setCode(json.code)
      setSelfAttestOpen(Boolean(json.selfAttestOpen))
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

  if (tooEarly) {
    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    return (
      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Check-in</h2>
        <div className="border border-border bg-card px-6 py-8 flex flex-col items-center gap-3 text-center">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-xs">
            Check-in opens 60 minutes before the shift{opensAt ? <> — at <span className="text-foreground font-mono">{fmtTime(opensAt)}</span></> : ""}.
          </p>
          {remaining > 0 && (
            <span className="font-mono text-2xl tabular-nums text-foreground">
              {mins}m {String(secs).padStart(2, "0")}s
            </span>
          )}
          {error && <p className="font-mono text-xs text-destructive">{error}</p>}
        </div>
      </section>
    )
  }

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
          Show this to the organizer on site — they scan the code (or enter the digits) to{" "}
          {phase === "check_in" ? "check you in" : "check you out"}. It rotates every 60 seconds.
        </p>
        {code && <QrCodeImage value={code} />}
        <span className="font-mono text-4xl md:text-5xl font-bold tabular-nums tracking-widest text-foreground">{pretty}</span>
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground tabular-nums">
          <Clock className="w-3 h-3" />
          {code ? `Rotates in ${remaining}s` : "Loading…"}
        </div>
        {error && <p className="font-mono text-xs text-destructive">{error}</p>}
      </div>

      {/* Self-attest fallback — only on the check-in leg, once 30 min past start
          with no organizer verification. */}
      {phase === "check_in" && selfAttestOpen && (
        <SelfAttestPanel bookingId={bookingId} viewerId={viewerId} />
      )}
    </section>
  )
}

// ── Medic: 30-min self-attest fallback ───────────────────────────────────────
function SelfAttestPanel({ bookingId, viewerId }: { bookingId: string; viewerId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!confirmed) return setError("Confirm you're on site first.")
    setBusy(true)
    setError(null)
    try {
      // Optional photo → owner's own folder in the private attestations bucket.
      let photoPath: string | null = null
      if (file) {
        const supabase = createClient()
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"
        const path = `${viewerId}/checkin_${bookingId}_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from("check-in-attestations")
          .upload(path, file, { upsert: false, contentType: file.type || undefined })
        if (upErr) {
          setError("Photo upload failed — you can attest without it.")
          setBusy(false)
          return
        }
        photoPath = path
      }
      const geo = await getGeo()
      const res = await fetch("/api/shifts/self-attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, note: note.trim() || undefined, photoPath, ...(geo ?? {}) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.reason || "Could not record your self-attest check-in.")
        setBusy(false)
        return
      }
      router.refresh()
    } catch {
      setError("Network error — please try again.")
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4 self-center"
      >
        Can&apos;t reach the organizer? Self-attest you&apos;re on site
      </button>
    )
  }

  return (
    <div className="border border-risk-medium/30 bg-risk-medium/5 flex flex-col">
      <div className="border-b border-risk-medium/20 px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-risk-medium">Self-attest check-in</span>
      </div>
      <div className="px-5 py-5 flex flex-col gap-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Use this only if the organizer can&apos;t verify you on site. It records a lower-assurance,
          self-attested check-in with your location — the organizer is notified. Add a photo to
          strengthen it.
        </p>

        <div className="flex flex-col gap-2">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
            <Camera className="w-3 h-3" /> On-site photo <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="font-mono text-xs text-muted-foreground file:mr-3 file:border file:border-input-border file:bg-input file:px-3 file:py-1.5 file:font-mono file:text-[10px] file:uppercase file:tracking-wider file:text-foreground"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Note <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={600}
            rows={2}
            placeholder="e.g. Arrived at the medical tent; organizer not reachable by phone."
            className="w-full px-3 py-2.5 bg-input border border-input-border text-foreground placeholder:text-placeholder font-mono text-sm resize-none focus:outline-none focus:border-primary"
          />
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            I confirm I am physically on site for this shift. I understand this is recorded as a
            self-attested check-in.
          </span>
        </label>

        {error && <p className="font-mono text-xs text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button
            disabled={busy || !confirmed}
            onClick={submit}
            className="rounded-none font-mono text-xs uppercase tracking-wider"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
            {busy ? "Recording…" : "Self-attest check-in"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="rounded-none font-mono text-xs uppercase tracking-wider"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Organizer: verify the medic's code ───────────────────────────────────────
function VerifyPanel({
  bookingId,
  phase,
  counterpartName,
  startsAtISO,
}: {
  bookingId: string
  phase: "check_in" | "check_out"
  counterpartName: string
  startsAtISO: string | null
}) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Client-side display of the 60-min gate (server is authoritative). Only on the
  // check-in leg, and only when a start time is set.
  const opensAtMs =
    phase === "check_in" && startsAtISO ? Date.parse(startsAtISO) - 60 * 60_000 : NaN
  const gated = Number.isFinite(opensAtMs) && Date.now() < opensAtMs

  // Shared by both input paths (typed digits + scanned QR). `via` only tags the
  // check_in row; the code is verified identically against the rotating secret.
  const submit = useCallback(
    async (submittedCode: string, via: "manual" | "qr") => {
      if (submittedCode.length !== 6) return setError("Enter the 6-digit code from the medic's screen.")
      setBusy(true)
      setError(null)
      const geo = await getGeo()
      try {
        const res = await fetch("/api/shifts/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, code: submittedCode, phase, method: via, ...(geo ?? {}) }),
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
    },
    [bookingId, phase, router]
  )

  const onScanDecode = useCallback(
    (scanned: string) => {
      setScanning(false)
      setCode(scanned)
      void submit(scanned, "qr")
    },
    [submit]
  )

  if (gated) {
    return (
      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Verify medic on site</h2>
        <div className="border border-border bg-card px-6 py-8 flex flex-col items-center gap-3 text-center">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-xs">
            Check-in opens 60 minutes before the shift — at{" "}
            <span className="text-foreground font-mono">{fmtTime(new Date(opensAtMs).toISOString())}</span>.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {phase === "check_in" ? "Verify medic on site" : "Verify check-out"}
      </h2>
      <div className="border border-border bg-card px-6 py-6 flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Scan the QR on {counterpartName}&apos;s screen — or enter the 6-digit code — to{" "}
          {phase === "check_in" ? "confirm they're on site" : "close out the shift"}.
        </p>

        {scanning ? (
          <QrScanner onDecode={onScanDecode} onClose={() => setScanning(false)} />
        ) : (
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null)
              setScanning(true)
            }}
            className="rounded-none font-mono text-xs uppercase tracking-wider"
          >
            <Camera className="w-3.5 h-3.5 mr-1.5" />
            Scan QR code
          </Button>
        )}

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">or enter it</span>
          <Separator className="flex-1" />
        </div>

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
        <Button
          type="button"
          disabled={busy || code.length !== 6}
          onClick={() => submit(code, "manual")}
          variant="outline"
          className="rounded-none font-mono text-xs uppercase tracking-wider"
        >
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
          {busy ? "Verifying…" : phase === "check_in" ? "Verify check-in" : "Verify check-out"}
        </Button>
        <p className="font-mono text-[10px] text-muted-foreground text-center">Codes expire every 60s — use the one showing now.</p>
      </div>
    </section>
  )
}

// ── Shift issue actions (mark no-show / cancel) ──────────────────────────────
function ShiftIssueActions({
  bookingId,
  viewerRole,
}: {
  bookingId: string
  viewerRole: "organizer" | "emt"
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<null | "no_show_emt" | "cancelled_organizer" | "cancelled_emt">(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: "no_show_emt" | "cancelled_organizer" | "cancelled_emt") => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/bookings/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.reason || "Could not update the shift.")
        setBusy(false)
        return
      }
      router.refresh()
    } catch {
      setError("Network error — please try again.")
      setBusy(false)
    }
  }

  const label = (a: typeof pending) =>
    a === "no_show_emt" ? "mark the medic a no-show" : "cancel this shift"

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive underline underline-offset-4 self-start"
      >
        Report an issue
      </button>
    )
  }

  return (
    <div className="border border-border bg-card px-5 py-4 flex flex-col gap-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Report an issue</span>
      {pending ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Confirm you want to {label(pending)}. This is recorded and affects the medic&apos;s reliability record.
          </p>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => run(pending)} className="rounded-none font-mono text-[10px] uppercase tracking-wider bg-destructive hover:bg-destructive/90">
              {busy ? "Working…" : "Confirm"}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPending(null)} className="rounded-none font-mono text-[10px] uppercase tracking-wider">
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {viewerRole === "organizer" && (
            <Button size="sm" variant="outline" onClick={() => setPending("no_show_emt")} className="rounded-none font-mono text-[10px] uppercase tracking-wider">
              Mark no-show
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPending(viewerRole === "organizer" ? "cancelled_organizer" : "cancelled_emt")}
            className="rounded-none font-mono text-[10px] uppercase tracking-wider"
          >
            Cancel shift
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="rounded-none font-mono text-[10px] uppercase tracking-wider">
            Never mind
          </Button>
        </div>
      )}
      {error && <p className="font-mono text-xs text-destructive">{error}</p>}
    </div>
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

// ── Review edit form (my published review, within 24h) ───────────────────────
function ReviewEditForm({
  review,
  viewerRole,
  onDone,
}: {
  review: ShiftReview
  viewerRole: "organizer" | "emt"
  onDone: () => void
}) {
  const router = useRouter()
  const dims = dimensionsFor(viewerRole)
  const [overall, setOverall] = useState(review.overall)
  const [scores, setScores] = useState<Record<string, number>>({ ...review.subscores })
  const [text, setText] = useState(review.body ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setScore = (k: string, v: number) => setScores((s) => ({ ...s, [k]: v }))
  const allRated = overall >= 1 && dims.every((d) => (scores[d.key] ?? 0) >= 1)

  const submit = async () => {
    setError(null)
    const check = validateReviewText(text, viewerRole)
    if (!check.ok) return setError(check.errors[0])
    setBusy(true)
    try {
      const res = await fetch("/api/reviews/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id, overall, subscores: scores, body: text }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.errors?.[0] || json?.reason || "Could not save your changes.")
        setBusy(false)
        return
      }
      router.refresh()
      onDone()
    } catch {
      setError("Network error — please try again.")
      setBusy(false)
    }
  }

  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Edit your review</span>
      </div>
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
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_REVIEW_LENGTH}
            rows={3}
            className="w-full px-3 py-2.5 bg-input border border-input-border text-foreground placeholder:text-placeholder font-mono text-sm resize-none focus:outline-none focus:border-primary"
          />
          <span className="font-mono text-[10px] text-muted-foreground text-right tabular-nums">{text.length}/{MAX_REVIEW_LENGTH}</span>
        </div>
        {error && <p className="font-mono text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button disabled={!allRated || busy} onClick={submit} className="rounded-none font-mono text-xs uppercase tracking-wider">
            <Check className="w-3.5 h-3.5 mr-1.5" />
            {busy ? "Saving…" : "Save changes"}
          </Button>
          <Button variant="ghost" onClick={onDone} className="rounded-none font-mono text-xs uppercase tracking-wider">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Reply form (the subject replies to a published review of them) ───────────
function ReplyForm({
  reviewId,
  replierRole,
  existing,
}: {
  reviewId: string
  replierRole: "organizer" | "emt"
  existing: ShiftReply | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(existing?.body ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    const check = validateReviewText(text, replierRole)
    if (!check.ok) return setError(check.errors[0])
    if (!text.trim()) return setError("Write a reply first.")
    setBusy(true)
    try {
      const res = await fetch("/api/reviews/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, body: text }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.errors?.[0] || json?.reason || "Could not post your reply.")
        setBusy(false)
        return
      }
      router.refresh()
      setOpen(false)
      setBusy(false)
    } catch {
      setError("Network error — please try again.")
      setBusy(false)
    }
  }

  // Existing reply, not editing → show it with an edit affordance.
  if (existing && !open) {
    return (
      <div className="mt-2 border-l-2 border-border pl-3 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Your reply</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-mono text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{existing.body}</p>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 font-mono text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4 self-start"
      >
        Reply publicly
      </button>
    )
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder="A brief, professional response. Public — keep it about the working relationship."
        className="w-full px-3 py-2.5 bg-input border border-input-border text-foreground placeholder:text-placeholder font-mono text-sm resize-none focus:outline-none focus:border-primary"
      />
      {error && <p className="font-mono text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={submit} className="rounded-none font-mono text-[10px] uppercase tracking-wider">
          {busy ? "Posting…" : existing ? "Save reply" : "Post reply"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="rounded-none font-mono text-[10px] uppercase tracking-wider">
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ── Reviews (double-blind) ───────────────────────────────────────────────────
function ReviewSection({
  bookingId,
  viewerRole,
  counterpartName,
  myReview,
  counterpartReview,
  replyToMyReview,
  myReplyToTheirReview,
}: {
  bookingId: string
  viewerRole: "organizer" | "emt"
  counterpartName: string
  myReview: ShiftReview | null
  counterpartReview: ShiftReview | null
  replyToMyReview: ShiftReply | null
  myReplyToTheirReview: ShiftReply | null
}) {
  const router = useRouter()
  const dims = dimensionsFor(viewerRole)
  const [overall, setOverall] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phiConfirm, setPhiConfirm] = useState(false) // medic PHI interstitial gate
  const [editing, setEditing] = useState(false)

  const setScore = (k: string, v: number) => setScores((s) => ({ ...s, [k]: v }))
  const allRated = overall >= 1 && dims.every((d) => (scores[d.key] ?? 0) >= 1)

  const submit = async () => {
    setError(null)
    const check = validateReviewText(text, viewerRole)
    if (!check.ok) return setError(check.errors[0])
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
  // I can edit my published review for 24h after it publishes (pending reviews
  // are always editable). The server + DB guard enforce the real lock.
  const myPublishedMs = myReview?.published_at ? Date.parse(myReview.published_at) : NaN
  const canEditMine =
    !!myReview &&
    (myReview.status !== "published" ||
      (Number.isFinite(myPublishedMs) && Date.now() < myPublishedMs + EDIT_WINDOW_MS))

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Reviews</h2>

      {/* Your review */}
      {myReview ? (
        editing ? (
          <ReviewEditForm review={myReview} viewerRole={viewerRole} onDone={() => setEditing(false)} />
        ) : (
          <div className="border border-border bg-card px-5 py-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Your review of the {subjectLabel}</span>
              <div className="flex items-center gap-2">
                {canEditMine && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="font-mono text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                )}
                <span className={cn(
                  "font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5",
                  myReview.status === "published" ? "border-risk-low/30 bg-risk-low/5 text-risk-low" : "border-risk-medium/30 bg-risk-medium/5 text-risk-medium"
                )}>
                  {myReview.status === "published" ? "Published" : "Awaiting reveal"}
                </span>
              </div>
            </div>
            <StaticStars overall={myReview.overall} />
            {myReview.body && <p className="text-sm text-muted-foreground leading-relaxed">{myReview.body}</p>}
            {myReview.status === "published" && canEditMine && (
              <p className="font-mono text-[10px] text-muted-foreground">Editable for 24 hours after publishing.</p>
            )}
            {myReview.status !== "published" && (
              <p className="font-mono text-[10px] text-muted-foreground">
                Hidden from {counterpartName} until they submit theirs (or 14 days pass) — then both reveal together.
              </p>
            )}
            {/* The counterpart's reply to my review (read-only). */}
            {replyToMyReview && (
              <div className="mt-1 border-l-2 border-border pl-3 flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{counterpartName} replied</span>
                <p className="text-sm text-muted-foreground leading-relaxed">{replyToMyReview.body}</p>
              </div>
            )}
          </div>
        )
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

      {/* Counterpart review — only when published. I'm its subject, so I can reply. */}
      {counterpartReview ? (
        <div className="border border-border bg-card px-5 py-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{counterpartName}&apos;s review</span>
            <ReportReviewButton reviewId={counterpartReview.id} />
          </div>
          <StaticStars overall={counterpartReview.overall} />
          {counterpartReview.body && <p className="text-sm text-muted-foreground leading-relaxed">{counterpartReview.body}</p>}
          <ReplyForm reviewId={counterpartReview.id} replierRole={viewerRole} existing={myReplyToTheirReview} />
        </div>
      ) : (
        <p className="font-mono text-[10px] text-muted-foreground">
          {counterpartName}&apos;s review stays hidden until you both submit (or the 14-day window closes).
        </p>
      )}
    </section>
  )
}

export function ShiftClient({
  bookingId,
  viewerRole,
  viewerId,
  status,
  startsAtISO,
  offeredRate,
  counterpartName,
  myReview,
  counterpartReview,
  replyToMyReview,
  myReplyToTheirReview,
}: ShiftClientProps) {
  // Check-in / check-out phase from the current booking status.
  const phase: "check_in" | "check_out" | null =
    status === "accepted" ? "check_in" : status === "checked_in" ? "check_out" : null

  if (status === "completed") {
    return (
      <div className="flex flex-col gap-8">
        <StatusRail status="completed" />
        <ReviewSection
          bookingId={bookingId}
          viewerRole={viewerRole}
          counterpartName={counterpartName}
          myReview={myReview}
          counterpartReview={counterpartReview}
          replyToMyReview={replyToMyReview}
          myReplyToTheirReview={myReplyToTheirReview}
        />
      </div>
    )
  }

  if (phase) {
    return (
      <div className="flex flex-col gap-8">
        <StatusRail status={status} />
        {viewerRole === "emt" ? (
          <CheckInCodePanel bookingId={bookingId} viewerId={viewerId} phase={phase} />
        ) : (
          <VerifyPanel bookingId={bookingId} phase={phase} counterpartName={counterpartName} startsAtISO={startsAtISO} />
        )}
        {/* No-show / cancel — only legal before check-in. */}
        {status === "accepted" && <ShiftIssueActions bookingId={bookingId} viewerRole={viewerRole} />}
        {/* Payment coordination — Phase 1 settles off-platform. */}
        <p className="font-mono text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-4">
          Agreed at ${offeredRate}/hr. Settle payment directly with your {viewerRole === "organizer" ? "medic" : "organizer"} — Standby doesn&apos;t process payments yet.
        </p>
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
