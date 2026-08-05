"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

// Admin moderation buttons for one report. `removed` toggles which actions apply
// (a removed review can be restored; a live one can be removed).
export function ModerationActions({ reportId, removed }: { reportId: string; removed: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: "dismiss" | "remove" | "restore") => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/reviews/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error || "Action failed.")
        setBusy(false)
        return
      }
      router.refresh()
    } catch {
      setError("Network error.")
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {removed ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run("restore")} className="rounded-none font-mono text-[10px] uppercase tracking-wider">
          Restore review
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run("remove")} className="rounded-none font-mono text-[10px] uppercase tracking-wider">
          Remove review
        </Button>
      )}
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => run("dismiss")} className="rounded-none font-mono text-[10px] uppercase tracking-wider">
        Dismiss report
      </Button>
      {error && <span className="font-mono text-[10px] text-destructive">{error}</span>}
    </div>
  )
}
