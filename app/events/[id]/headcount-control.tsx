"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { planHeadcount, HEADCOUNT_MAX, type HeadcountState } from "@/lib/events/headcount"

// Map the set_event_headcount definer's raised exceptions to organizer copy.
function headcountError(message: string | undefined): string {
  const m = message ?? ""
  if (m.includes("BELOW_FLOOR")) return "Can't go that low — rescind held invitations or remove confirmed medics first."
  if (m.includes("OVERRIDE_REASON_REQUIRED")) return "Below the recommended staffing — add a short reason to proceed."
  if (m.includes("NO_TEMPLATE")) return "Post one slot first, then adjust the headcount from it."
  if (m.includes("FORBIDDEN")) return "You don't manage this event."
  if (m.includes("OUT_OF_RANGE")) return "Pick a headcount between 0 and 50."
  return "Could not update the headcount."
}

interface HeadcountControlProps {
  eventId: string
  /** Confirmed positions (accepted / checked-in / completed). */
  filled: number
  state: HeadcountState
  /** Stored required_medics, or null if never set (then the target defaults to live). */
  required: number | null
}

export function HeadcountControl({ eventId, filled, state, required }: HeadcountControlProps) {
  const router = useRouter()
  const initial = required ?? state.live
  const [target, setTarget] = useState(initial)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = planHeadcount(state, target, reason)
  const dirty = target !== initial
  const denom = required ?? state.live

  const clamp = (n: number) => Math.max(0, Math.min(HEADCOUNT_MAX, n))

  const apply = async () => {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: rpcErr } = await supabase.rpc("set_event_headcount", {
      p_event_id: eventId,
      p_count: target,
      p_reason: reason.trim() || null,
    })
    if (rpcErr) {
      setError(headcountError(rpcErr.message))
      setBusy(false)
      return
    }
    router.refresh()
  }

  return (
    <section className="border border-border bg-card px-5 py-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Staffing</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl tabular-nums font-bold text-foreground leading-none">
              {filled} / {denom}
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">staffed</span>
          </div>
          {state.recommendedTotal != null && (
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              Model recommends {state.recommendedTotal}
              {denom < state.recommendedTotal ? ` · ${state.recommendedTotal - denom} under` : ""}
            </span>
          )}
        </div>

        {/* Stepper — adjusts the target headcount; positions reconcile on apply. */}
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-border">
            <button
              type="button"
              aria-label="Decrease headcount"
              onClick={() => setTarget((t) => clamp(t - 1))}
              disabled={busy || target <= 0}
              className="h-9 w-9 flex items-center justify-center text-foreground hover:bg-secondary disabled:opacity-40"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="h-9 w-12 flex items-center justify-center font-mono text-sm tabular-nums text-foreground border-x border-border">
              {target}
            </span>
            <button
              type="button"
              aria-label="Increase headcount"
              onClick={() => setTarget((t) => clamp(t + 1))}
              disabled={busy || target >= HEADCOUNT_MAX}
              className="h-9 w-9 flex items-center justify-center text-foreground hover:bg-secondary disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {dirty && (
            <Button
              size="sm"
              disabled={busy || (preview.error !== null && preview.error !== "OVERRIDE_REASON_REQUIRED")}
              onClick={apply}
              className="rounded-xl font-mono text-[10px] uppercase tracking-wider"
            >
              {busy ? "Updating…" : "Update"}
            </Button>
          )}
        </div>
      </div>

      {/* Reason — required when the target is below the model recommendation. */}
      {dirty && preview.belowRecommended && (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for staffing below the recommendation (recorded for the compliance report)…"
          maxLength={300}
          className="w-full h-9 px-3 bg-input border border-input-border text-foreground placeholder:text-placeholder font-mono text-xs focus:outline-none focus:border-primary"
        />
      )}

      {/* Live preview / floor guidance. */}
      {dirty && (
        <p className="font-mono text-[10px] tabular-nums text-muted-foreground leading-relaxed">
          {preview.error === "BELOW_FLOOR"
            ? `Floor is ${preview.floor} — ${state.open} open slot${state.open === 1 ? "" : "s"} can be retired; held and confirmed positions must be released individually first.`
            : preview.retire > 0
            ? `Retires ${preview.retire} open slot${preview.retire === 1 ? "" : "s"} (highest position first).`
            : preview.revive > 0 || preview.append > 0
            ? `Adds ${preview.revive + preview.append} slot${preview.revive + preview.append === 1 ? "" : "s"}${preview.revive > 0 ? ` (revives ${preview.revive} retired)` : ""}.`
            : "No change."}
        </p>
      )}

      {error && <p className="font-mono text-[10px] text-destructive leading-relaxed">{error}</p>}
    </section>
  )
}
