// Pure headcount planner — mirrors the set_event_headcount definer (migration
// 0019) so the UI can preview + validate a target before calling it. The definer
// is authoritative (it applies the change atomically across many rows); this
// computes the SAME plan client-side for the stepper's live preview and to block
// illegal targets before a round-trip. Keep the two in lockstep.

export const HEADCOUNT_MAX = 50

export interface HeadcountState {
  /** Current headcount N: open+invited+accepted+checked_in(+completed+no_show). */
  live: number
  /** Retire-able positions (status='open'). */
  open: number
  /** Revive-able parked slots (status='retired'). */
  retired: number
  /** Sum of recommended_staffing's composition, or null if unset. */
  recommendedTotal: number | null
}

export type HeadcountError = "OUT_OF_RANGE" | "BELOW_FLOOR" | "OVERRIDE_REASON_REQUIRED"

export interface HeadcountPreview {
  target: number
  /** Minimum reachable by retiring open slots alone: live − open. */
  floor: number
  delta: number
  revive: number
  append: number
  retire: number
  /** target < recommendedTotal — a reason is required and the override is stamped. */
  belowRecommended: boolean
  error: HeadcountError | null
}

export function planHeadcount(
  state: HeadcountState,
  target: number,
  reason?: string | null
): HeadcountPreview {
  const floor = state.live - state.open
  const preview: HeadcountPreview = {
    target,
    floor,
    delta: target - state.live,
    revive: 0,
    append: 0,
    retire: 0,
    belowRecommended: state.recommendedTotal != null && target < state.recommendedTotal,
    error: null,
  }

  if (!Number.isInteger(target) || target < 0 || target > HEADCOUNT_MAX) {
    return { ...preview, error: "OUT_OF_RANGE" }
  }

  if (target > state.live) {
    // Increase: revive retired ascending first, then append the rest.
    const need = target - state.live
    preview.revive = Math.min(need, state.retired)
    preview.append = need - preview.revive
  } else if (target < state.live) {
    // Decrease: only `open` positions are retire-able. Below the floor is illegal
    // — the organizer must rescind/remove specific held/confirmed positions first.
    const remove = state.live - target
    if (remove > state.open) return { ...preview, error: "BELOW_FLOOR" }
    preview.retire = remove
  }

  if (preview.belowRecommended && (!reason || reason.trim() === "")) {
    return { ...preview, error: "OVERRIDE_REASON_REQUIRED" }
  }
  return preview
}
