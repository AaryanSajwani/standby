// ─────────────────────────────────────────────────────────────────────────────
// Reliability metrics + star-rating display math (PR B / PR 4).
//
// Two independent ideas the build prompts insist on:
//
//   1. RELIABILITY is COMPUTED from bookings, never reviewed. It can't be gamed
//      and needs no counterparty participation, so for medical coverage it is the
//      real signal — display it ABOVE star averages.
//
//   2. STAR AVERAGES use Bayesian shrinkage toward the platform mean, and are
//      hidden entirely under 5 reviews ("New to Standby"). This stops one or two
//      early reviews from swinging a profile to 1.0 or 5.0.
//
// Pure functions over plain records — unit-testable on a seeded fixture with
// hand-computed values, no DB required.
// ─────────────────────────────────────────────────────────────────────────────

import type { BookingState } from "@/lib/bookings/state-machine"

// ── Star-rating display (Bayesian shrinkage) ─────────────────────────────────

/** Prior weight C in (C·m + Σ) / (C + n). Build-prompts: C = 5. */
export const SHRINKAGE_PRIOR = 5
/** Below this many reviews, show "New to Standby" instead of an average. */
export const MIN_REVIEWS_FOR_AVERAGE = 5
export const NEW_BADGE = "New to Standby"

/** Shrunk mean: (C·m + Σ ratings) / (C + n). With n = 0 this returns the prior m. */
export function shrunkAverage(ratings: number[], platformMean: number, C = SHRINKAGE_PRIOR): number {
  const n = ratings.length
  const sum = ratings.reduce((a, b) => a + b, 0)
  return (C * platformMean + sum) / (C + n)
}

export interface RatingDisplay {
  /** Raw review count — always shown next to (or instead of) any average. */
  count: number
  /** True when count < MIN_REVIEWS_FOR_AVERAGE (no average shown). */
  sparse: boolean
  /** Shrunk average rounded to one decimal, or null when sparse. */
  average: number | null
  /** "New to Standby" when sparse, else null. */
  badge: string | null
}

export function ratingDisplay(ratings: number[], platformMean: number): RatingDisplay {
  const count = ratings.length
  const sparse = count < MIN_REVIEWS_FOR_AVERAGE
  if (sparse) {
    return { count, sparse: true, average: null, badge: NEW_BADGE }
  }
  return {
    count,
    sparse: false,
    average: Math.round(shrunkAverage(ratings, platformMean) * 10) / 10,
    badge: null,
  }
}

// ── Computed reliability from booking outcomes ───────────────────────────────

export interface ShiftRecord {
  status: BookingState
  /** Event/shift start (ISO). Used for on-time comparison and rolling windows. */
  shiftStartISO: string
  /** When the medic checked in on site, if they did (ISO). */
  checkInAtISO?: string | null
  /** When a terminal outcome (cancel / no-show / completion) was recorded (ISO). */
  resolvedAtISO?: string | null
}

export interface ReliabilityStats {
  completedCount: number
  /** Shifts the medic committed to that reached a terminal outcome. */
  committedCount: number
  /** completed / committed, or null when there is nothing committed yet. */
  completionRate: number | null
  onTimeCount: number
  checkedInCount: number
  /** onTime / checkedIn, or null when there are no check-ins yet. */
  onTimeRate: number | null
  /** cancelled_emt within the trailing 90 days. */
  lateCancelCount90d: number
  /** no_show_emt within the trailing 365 days. */
  noShowCount365d: number
}

const DAY_MS = 24 * 60 * 60 * 1000

export interface ReliabilityOptions {
  /** A check-in at or before start + grace counts as on-time. Default 5 minutes. */
  onTimeGraceMinutes?: number
}

/**
 * Compute reliability from an EMT's shift history as of `nowISO`. Committed =
 * shifts that reached one of {completed, no_show_emt, cancelled_emt}; earlier-
 * stage cancels (declined, organizer-cancel, expired) are not the medic's
 * reliability and are excluded from the denominator.
 */
export function computeReliability(
  records: ShiftRecord[],
  nowISO: string,
  options: ReliabilityOptions = {}
): ReliabilityStats {
  const graceMs = (options.onTimeGraceMinutes ?? 5) * 60 * 1000
  const now = Date.parse(nowISO)

  let completedCount = 0
  let committedCount = 0
  let onTimeCount = 0
  let checkedInCount = 0
  let lateCancelCount90d = 0
  let noShowCount365d = 0

  for (const r of records) {
    const committed =
      r.status === "completed" || r.status === "no_show_emt" || r.status === "cancelled_emt"
    if (committed) committedCount++
    if (r.status === "completed") completedCount++

    if (r.checkInAtISO) {
      const start = Date.parse(r.shiftStartISO)
      const checkIn = Date.parse(r.checkInAtISO)
      // Only count toward the on-time denominator when both timestamps parse —
      // an unparseable start would otherwise be a guaranteed miss that silently
      // deflates onTimeRate.
      if (Number.isFinite(start) && Number.isFinite(checkIn)) {
        checkedInCount++
        if (checkIn <= start + graceMs) onTimeCount++
      }
    }

    // Rolling-window reference: when the terminal outcome's own timestamp is
    // missing, fall back to the shift start rather than dropping the penalty
    // entirely (a null resolvedAt must not let a late-cancel/no-show escape the
    // window it belongs to).
    const resolvedRaw = r.resolvedAtISO ?? r.shiftStartISO
    const resolved = resolvedRaw ? Date.parse(resolvedRaw) : NaN
    if (r.status === "cancelled_emt" && Number.isFinite(resolved) && now - resolved <= 90 * DAY_MS) {
      lateCancelCount90d++
    }
    if (r.status === "no_show_emt" && Number.isFinite(resolved) && now - resolved <= 365 * DAY_MS) {
      noShowCount365d++
    }
  }

  return {
    completedCount,
    committedCount,
    completionRate: committedCount === 0 ? null : completedCount / committedCount,
    onTimeCount,
    checkedInCount,
    onTimeRate: checkedInCount === 0 ? null : onTimeCount / checkedInCount,
    lateCancelCount90d,
    noShowCount365d,
  }
}

/** Format a 0..1 rate as a whole-percent string, or an em dash when null. */
export function formatRate(rate: number | null): string {
  if (rate === null) return "—"
  return `${Math.round(rate * 100)}%`
}
