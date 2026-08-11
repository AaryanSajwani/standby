import { describe, it, expect } from "vitest"
import { planHeadcount, HEADCOUNT_MAX, type HeadcountState } from "./headcount"

// Base: 3 live positions (1 open, 2 accepted), no retired, no recommendation.
const base: HeadcountState = { live: 3, open: 1, retired: 0, recommendedTotal: null }

describe("planHeadcount", () => {
  it("no-op when target equals current live", () => {
    const p = planHeadcount(base, 3)
    expect(p.error).toBeNull()
    expect([p.revive, p.append, p.retire]).toEqual([0, 0, 0])
    expect(p.delta).toBe(0)
  })

  it("increase with no retired appends all new slots", () => {
    const p = planHeadcount(base, 5)
    expect(p.error).toBeNull()
    expect(p.revive).toBe(0)
    expect(p.append).toBe(2)
    expect(p.retire).toBe(0)
  })

  it("increase revives retired ascending before appending", () => {
    // 3 live + 1 retired; grow to 6 → revive the 1 retired, append 2.
    const p = planHeadcount({ ...base, retired: 1 }, 6)
    expect(p.revive).toBe(1)
    expect(p.append).toBe(2)
  })

  it("increase revives only up to what's needed", () => {
    // 3 live + 3 retired; grow to 4 → revive exactly 1, append 0.
    const p = planHeadcount({ ...base, retired: 3 }, 4)
    expect(p.revive).toBe(1)
    expect(p.append).toBe(0)
  })

  it("decrease within the open pool retires open slots", () => {
    const p = planHeadcount(base, 2) // 1 open → retire it
    expect(p.error).toBeNull()
    expect(p.retire).toBe(1)
  })

  it("floor = live − open; below the floor is rejected", () => {
    const p = planHeadcount(base, 1) // floor is 2 (2 accepted can't be retired)
    expect(p.floor).toBe(2)
    expect(p.error).toBe("BELOW_FLOOR")
  })

  it("held (invited) positions count toward the floor", () => {
    // 4 live: 1 open + 1 invited + 2 accepted. Only the open one is retire-able,
    // so the floor is 3 — decreasing to 2 is illegal.
    const held: HeadcountState = { live: 4, open: 1, retired: 0, recommendedTotal: null }
    expect(planHeadcount(held, 3).error).toBeNull() // retire the 1 open → ok
    expect(planHeadcount(held, 2).error).toBe("BELOW_FLOOR")
  })

  it("below recommended total requires a reason, then stamps the override", () => {
    const rec: HeadcountState = { ...base, recommendedTotal: 3 }
    const noReason = planHeadcount(rec, 2)
    expect(noReason.belowRecommended).toBe(true)
    expect(noReason.error).toBe("OVERRIDE_REASON_REQUIRED")
    const withReason = planHeadcount(rec, 2, "Second medic covers the west stage")
    expect(withReason.error).toBeNull()
    expect(withReason.belowRecommended).toBe(true)
  })

  it("meeting or exceeding the recommendation needs no reason", () => {
    const rec: HeadcountState = { ...base, retired: 0, recommendedTotal: 3 }
    expect(planHeadcount(rec, 3).belowRecommended).toBe(false)
    expect(planHeadcount(rec, 4).error).toBeNull()
  })

  it("rejects out-of-range targets", () => {
    expect(planHeadcount(base, -1).error).toBe("OUT_OF_RANGE")
    expect(planHeadcount(base, HEADCOUNT_MAX + 1).error).toBe("OUT_OF_RANGE")
    expect(planHeadcount(base, 2.5).error).toBe("OUT_OF_RANGE")
  })
})
