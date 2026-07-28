import { describe, it, expect } from "vitest"
import {
  SHRINKAGE_PRIOR,
  MIN_REVIEWS_FOR_AVERAGE,
  NEW_BADGE,
  shrunkAverage,
  ratingDisplay,
  computeReliability,
  formatRate,
  type ShiftRecord,
} from "./reliability"

describe("Bayesian shrinkage", () => {
  it("matches the hand-computed (C·m + Σ)/(C + n)", () => {
    // 12 ratings of 4.0, platform mean 4.2, C = 5:
    //   (5·4.2 + 12·4) / (5 + 12) = (21 + 48) / 17 = 69/17 = 4.0588…
    const ratings = Array(12).fill(4)
    expect(shrunkAverage(ratings, 4.2)).toBeCloseTo(69 / 17, 6)
    expect(SHRINKAGE_PRIOR).toBe(5)
  })

  it("with zero reviews returns the platform mean (pure prior)", () => {
    expect(shrunkAverage([], 4.3)).toBeCloseTo(4.3, 6)
  })

  it("pulls extreme small samples toward the mean", () => {
    // One 5-star review, mean 4.0: (5·4 + 5)/(5+1) = 25/6 = 4.1667, not 5.0
    expect(shrunkAverage([5], 4.0)).toBeCloseTo(25 / 6, 6)
  })
})

describe("ratingDisplay sparse-data handling", () => {
  it("shows 'New to Standby' and no average under 5 reviews", () => {
    const d = ratingDisplay([5, 4, 5], 4.2) // 3 reviews
    expect(d.count).toBe(3)
    expect(d.sparse).toBe(true)
    expect(d.average).toBeNull()
    expect(d.badge).toBe(NEW_BADGE)
  })

  it("shows the shrunk average and the raw count at/above 5 reviews", () => {
    const d = ratingDisplay(Array(12).fill(4), 4.2) // 12 reviews
    expect(d.count).toBe(12)
    expect(d.sparse).toBe(false)
    expect(d.badge).toBeNull()
    expect(d.average).toBe(4.1) // round(4.0588…·10)/10
  })

  it("treats exactly MIN_REVIEWS_FOR_AVERAGE as non-sparse", () => {
    const d = ratingDisplay(Array(MIN_REVIEWS_FOR_AVERAGE).fill(5), 4.0)
    expect(d.sparse).toBe(false)
    expect(d.average).not.toBeNull()
  })
})

describe("computeReliability on a seeded fixture", () => {
  const NOW = "2026-07-26T00:00:00.000Z"

  // Hand-built history: 3 completed (2 on-time, 1 late), 1 no-show (recent),
  // 1 emt-cancel (recent), 1 emt-cancel (old, >90d), 1 organizer-cancel (excluded),
  // 1 declined (excluded).
  const records: ShiftRecord[] = [
    { status: "completed", shiftStartISO: "2026-07-01T18:00:00Z", checkInAtISO: "2026-07-01T17:58:00Z", resolvedAtISO: "2026-07-01T23:00:00Z" }, // on-time
    { status: "completed", shiftStartISO: "2026-07-05T18:00:00Z", checkInAtISO: "2026-07-05T18:03:00Z", resolvedAtISO: "2026-07-05T23:00:00Z" }, // on-time (within 5m grace)
    { status: "completed", shiftStartISO: "2026-07-10T18:00:00Z", checkInAtISO: "2026-07-10T18:20:00Z", resolvedAtISO: "2026-07-10T23:00:00Z" }, // late
    { status: "no_show_emt", shiftStartISO: "2026-07-12T18:00:00Z", resolvedAtISO: "2026-07-12T19:00:00Z" }, // recent no-show
    { status: "cancelled_emt", shiftStartISO: "2026-07-20T18:00:00Z", resolvedAtISO: "2026-07-20T09:00:00Z" }, // recent late-cancel
    { status: "cancelled_emt", shiftStartISO: "2026-01-01T18:00:00Z", resolvedAtISO: "2026-01-01T09:00:00Z" }, // >90d ago
    { status: "cancelled_organizer", shiftStartISO: "2026-07-15T18:00:00Z", resolvedAtISO: "2026-07-15T09:00:00Z" }, // excluded
    { status: "declined", shiftStartISO: "2026-07-18T18:00:00Z", resolvedAtISO: "2026-07-18T09:00:00Z" }, // excluded
  ]

  const stats = computeReliability(records, NOW)

  it("counts completed and committed correctly (excludes organizer-cancel & declined)", () => {
    expect(stats.completedCount).toBe(3)
    // committed = completed(3) + no_show(1) + emt_cancel(2) = 6
    expect(stats.committedCount).toBe(6)
    expect(stats.completionRate).toBeCloseTo(3 / 6, 6)
  })

  it("computes on-time rate against check-in vs start (5-minute grace)", () => {
    expect(stats.checkedInCount).toBe(3)
    expect(stats.onTimeCount).toBe(2)
    expect(stats.onTimeRate).toBeCloseTo(2 / 3, 6)
  })

  it("applies the rolling 90-day late-cancel and 365-day no-show windows", () => {
    expect(stats.lateCancelCount90d).toBe(1) // the Jan cancel is >90d out
    expect(stats.noShowCount365d).toBe(1)
  })

  it("returns null rates for an empty history rather than dividing by zero", () => {
    const empty = computeReliability([], NOW)
    expect(empty.completionRate).toBeNull()
    expect(empty.onTimeRate).toBeNull()
  })
})

describe("formatRate", () => {
  it("renders whole percents and an em dash for null", () => {
    expect(formatRate(0.6667)).toBe("67%")
    expect(formatRate(1)).toBe("100%")
    expect(formatRate(null)).toBe("—")
  })
})
