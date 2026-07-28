import { describe, it, expect } from "vitest"
import {
  FEE_BPS,
  MIN_PLATFORM_FEE_CENTS,
  roundHalfUp,
  computeBookingAmounts,
  formatCents,
} from "./fee"

describe("settled fee constants", () => {
  it("are 15% and a $15 floor", () => {
    expect(FEE_BPS).toBe(1500)
    expect(MIN_PLATFORM_FEE_CENTS).toBe(1500)
  })
})

describe("roundHalfUp", () => {
  it("rounds .5 up and leaves integers alone", () => {
    expect(roundHalfUp(1049.5)).toBe(1050)
    expect(roundHalfUp(1050)).toBe(1050)
    expect(roundHalfUp(0.49)).toBe(0)
  })
})

describe("computeBookingAmounts — spec examples (hand-computed cents)", () => {
  it("6h @ $45: organizer pays $310.50, floor NOT engaged", () => {
    // emtRate = 4500 · 6 = 27000; fee = 15% = 4050 (> 1500 floor); total = 31050
    const a = computeBookingAmounts(4500, 6)
    expect(a.emtRateCents).toBe(27000)
    expect(a.platformFeeCents).toBe(4050)
    expect(a.taxCents).toBe(0)
    expect(a.totalChargeCents).toBe(31050)
    expect(a.floorEngaged).toBe(false)
    expect(formatCents(a.totalChargeCents)).toBe("$310.50")
  })

  it("2h @ $35: fee floor ENGAGES ($10.50 → $15.00)", () => {
    // emtRate = 3500 · 2 = 7000; 15% = 1050 (< 1500 floor) → fee 1500; total = 8500
    const a = computeBookingAmounts(3500, 2)
    expect(a.emtRateCents).toBe(7000)
    expect(a.platformFeeCents).toBe(1500)
    expect(a.floorEngaged).toBe(true)
    expect(a.totalChargeCents).toBe(8500)
    expect(formatCents(a.totalChargeCents)).toBe("$85.00")
  })

  it("the medic always receives 100% of their posted rate (buyer-side)", () => {
    const a = computeBookingAmounts(4500, 6)
    expect(a.emtRateCents).toBe(4500 * 6) // fee is never deducted from the medic
    expect(a.totalChargeCents - a.platformFeeCents - a.taxCents).toBe(a.emtRateCents)
  })

  it("floor is inert just above the break-even and engages just below it", () => {
    // Break-even: 15% of emtRate = 1500 ⇒ emtRate = 10000 ($100 of medic pay).
    const above = computeBookingAmounts(10100, 1) // $101 → fee 1515
    expect(above.floorEngaged).toBe(false)
    expect(above.platformFeeCents).toBe(1515)

    const below = computeBookingAmounts(9900, 1) // $99 → fee 1485 < 1500
    expect(below.floorEngaged).toBe(true)
    expect(below.platformFeeCents).toBe(1500)
  })

  it("handles fractional (half-hour) durations with integer cents", () => {
    // 2.5h @ $30 = 3000·2.5 = 7500; 15% = 1125 < 1500 → floor 1500; total 9000
    const a = computeBookingAmounts(3000, 2.5)
    expect(a.emtRateCents).toBe(7500)
    expect(a.platformFeeCents).toBe(1500)
    expect(a.totalChargeCents).toBe(9000)
  })

  it("snapshots the config it used", () => {
    const a = computeBookingAmounts(4500, 6)
    expect(a.feeBps).toBe(FEE_BPS)
    expect(a.minPlatformFeeCents).toBe(MIN_PLATFORM_FEE_CENTS)
  })

  it("respects an overridden fee config (for future repricing)", () => {
    const a = computeBookingAmounts(10000, 1, { feeBps: 1000, minPlatformFeeCents: 500 })
    expect(a.platformFeeCents).toBe(1000) // 10% of 10000
    expect(a.floorEngaged).toBe(false)
  })

  it("rejects nonsensical inputs rather than emitting garbage cents", () => {
    expect(() => computeBookingAmounts(-1, 6)).toThrow(RangeError)
    expect(() => computeBookingAmounts(4500, 0)).toThrow(RangeError)
    expect(() => computeBookingAmounts(4500, -2)).toThrow(RangeError)
    expect(() => computeBookingAmounts(Number.NaN, 6)).toThrow(RangeError)
  })
})

describe("formatCents", () => {
  it("formats with two decimals and thousands separators", () => {
    expect(formatCents(31050)).toBe("$310.50")
    expect(formatCents(8500)).toBe("$85.00")
    expect(formatCents(0)).toBe("$0.00")
    expect(formatCents(123456789)).toBe("$1,234,567.89")
  })
})
