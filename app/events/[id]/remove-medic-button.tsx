"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserMinus } from "lucide-react"
import { Button } from "@/components/ui/button"

// Two-step inline confirm (not a hover reveal — hover doesn't exist on touch).
// Removing an accepted medic reopens the slot at the same index and notifies them.
export function RemoveMedicButton({ bookingId, medicName }: { bookingId: string; medicName: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/bookings/unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.reason || "Could not remove this medic.")
        setBusy(false)
        setConfirming(false)
        return
      }
      // Slot returns to `open` and reappears under Open slots on refresh, where the
      // organizer can invite a replacement or take applicants.
      router.refresh()
    } catch {
      setError("Network error — please try again.")
      setBusy(false)
      setConfirming(false)
    }
  }

  if (error) {
    return <span className="font-mono text-[10px] text-destructive max-w-[13rem] text-right leading-tight">{error}</span>
  }

  if (!confirming) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setConfirming(true)}
        className="rounded-none font-mono text-[10px] uppercase tracking-wider"
      >
        <UserMinus className="w-3 h-3 mr-1.5" />
        Remove
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">Remove {medicName}?</span>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => setConfirming(false)}
        className="rounded-none font-mono text-[10px] uppercase tracking-wider"
      >
        Keep
      </Button>
      <Button
        size="sm"
        disabled={busy}
        onClick={remove}
        className="rounded-none font-mono text-[10px] uppercase tracking-wider"
      >
        {busy ? "Removing…" : "Confirm"}
      </Button>
    </div>
  )
}
