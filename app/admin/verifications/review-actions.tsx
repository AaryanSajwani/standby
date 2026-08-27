"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

type Status = "pending" | "accepted" | "rejected"

// Per-applicant decision controls. Actions are contextual:
//   pending  → Approve · Reject · Reject & email
//   accepted → Revoke access · Revoke & email   (revoke = reject an accepted one)
//   rejected → Approve   (reinstate)
// "Reject" is silent (bots / obvious non-EMTs); "Reject & email" opens a reason
// field and sends the applicant a templated email with that reason.
export function VerificationActions({
  emtProfileId,
  status,
  name,
}: {
  emtProfileId: string
  status: Status
  name: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<null | "accept" | "reject" | "reject_email">(null)
  const [error, setError] = useState<string | null>(null)
  const [showReason, setShowReason] = useState(false)
  const [reason, setReason] = useState("")

  const rejecting = status === "accepted" ? "Revoke access" : "Reject"
  const rejectingEmail = status === "accepted" ? "Revoke & send email" : "Reject & send email"

  const run = async (action: "accept" | "reject", opts?: { notify?: boolean; reason?: string; key?: "reject" | "reject_email" }) => {
    setBusy(action === "accept" ? "accept" : opts?.key ?? "reject")
    setError(null)
    try {
      const res = await fetch("/api/admin/emt/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emtProfileId, action, notify: opts?.notify ?? false, reason: opts?.reason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.reason || "That didn't go through — try again.")
        setBusy(null)
        return
      }
      setShowReason(false)
      setReason("")
      router.refresh()
    } catch {
      setError("Network error — please try again.")
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex flex-wrap items-center gap-2">
        {status !== "accepted" && (
          <Button
            type="button"
            size="sm"
            disabled={busy !== null}
            onClick={() => run("accept")}
            className="rounded-none font-mono text-[10px] uppercase tracking-wider"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            {busy === "accept" ? "Approving…" : status === "rejected" ? "Approve (reinstate)" : "Approve"}
          </Button>
        )}

        {status !== "rejected" && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => run("reject", { notify: false, key: "reject" })}
              className="rounded-none font-mono text-[10px] uppercase tracking-wider"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              {busy === "reject" ? "Rejecting…" : rejecting}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => {
                setError(null)
                setShowReason((s) => !s)
              }}
              className="rounded-none font-mono text-[10px] uppercase tracking-wider"
            >
              <Mail className="w-3.5 h-3.5 mr-1" />
              {rejectingEmail}
            </Button>
          </>
        )}
      </div>

      {showReason && status !== "rejected" && (
        <div className="border border-border bg-background/40 p-3 flex flex-col gap-2">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Reason emailed to {name ?? "the applicant"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 2000))}
            rows={3}
            placeholder="e.g. The uploaded credential was unreadable — please re-submit a clear photo of your current EMT license."
            className="w-full bg-input border border-input-border text-foreground text-sm px-3 py-2 resize-y focus:outline-none focus:border-primary"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy !== null || reason.trim().length === 0}
              onClick={() => run("reject", { notify: true, reason: reason.trim(), key: "reject_email" })}
              className="rounded-none font-mono text-[10px] uppercase tracking-wider"
            >
              <Mail className="w-3.5 h-3.5 mr-1" />
              {busy === "reject_email" ? "Sending…" : "Reject and send email"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setShowReason(false)
                setReason("")
              }}
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="font-mono text-xs text-destructive">{error}</p>}
    </div>
  )
}
