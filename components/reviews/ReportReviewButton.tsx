"use client"

import { useState } from "react"
import { Flag } from "lucide-react"
import { Button } from "@/components/ui/button"

const REASONS: { value: string; label: string }[] = [
  { value: "phi", label: "Contains patient information" },
  { value: "contact_info", label: "Contains contact info / off-platform" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "inaccurate", label: "Inaccurate or misleading" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
]

// Flags a published review for moderator review. Signed-in users only — an
// anonymous visitor sees nothing (the POST would 401). Soft, non-destructive:
// filing a report never hides the review; an admin decides.
export function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [description, setDescription] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!reason) return setError("Pick a reason.")
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/reviews/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, reason, description: description.trim() || undefined }),
      })
      if (res.status === 401) {
        setError("Sign in to report a review.")
        setBusy(false)
        return
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.reason || "Could not submit the report.")
        setBusy(false)
        return
      }
      setDone(true)
    } catch {
      setError("Network error — please try again.")
      setBusy(false)
    }
  }

  if (done) {
    return <span className="font-mono text-[10px] text-muted-foreground">Report received — thank you.</span>
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[10px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
        aria-label="Report this review"
      >
        <Flag className="w-3 h-3" /> Report
      </button>
    )
  }

  return (
    <div className="mt-2 border border-border bg-surface px-3 py-3 flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Report review</span>
      <div className="relative">
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full h-9 px-2 bg-input border border-input-border text-foreground font-mono text-xs appearance-none focus:outline-none focus:border-primary"
        >
          <option value="">Select a reason…</option>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value} className="bg-popover">{r.label}</option>
          ))}
        </select>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder="Add detail (optional)"
        className="w-full px-2 py-1.5 bg-input border border-input-border text-foreground placeholder:text-placeholder font-mono text-xs resize-none focus:outline-none focus:border-primary"
      />
      {error && <p className="font-mono text-[10px] text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={submit} className="rounded-xl font-mono text-[10px] uppercase tracking-wider">
          {busy ? "Sending…" : "Submit report"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-mono text-[10px] uppercase tracking-wider">
          Cancel
        </Button>
      </div>
    </div>
  )
}
