import { describe, it, expect } from "vitest"
import {
  CHECK_IN_LEAD_MINUTES,
  SELF_ATTEST_AFTER_MINUTES,
  toMillis,
  checkInOpensAt,
  isCheckInOpen,
  selfAttestOpensAt,
  isSelfAttestOpen,
} from "./timing"

const MIN = 60_000
// A fixed reference instant so nothing depends on the wall clock.
const START = Date.parse("2026-08-10T18:00:00.000Z")

describe("toMillis", () => {
  it("parses an ISO timestamp", () => {
    expect(toMillis("2026-08-10T18:00:00.000Z")).toBe(START)
  })
  it("returns null for null/empty/garbage", () => {
    expect(toMillis(null)).toBeNull()
    expect(toMillis(undefined)).toBeNull()
    expect(toMillis("")).toBeNull()
    expect(toMillis("not-a-date")).toBeNull()
  })
})

describe("check-in gate (60 min before start)", () => {
  it("opens exactly 60 minutes before start", () => {
    expect(checkInOpensAt(START)).toBe(START - CHECK_IN_LEAD_MINUTES * MIN)
  })
  it("is closed 61 min before, open at 60 min before and after", () => {
    expect(isCheckInOpen(START, START - 61 * MIN)).toBe(false)
    expect(isCheckInOpen(START, START - 60 * MIN)).toBe(true)
    expect(isCheckInOpen(START, START)).toBe(true)
    expect(isCheckInOpen(START, START + 120 * MIN)).toBe(true) // no upper bound
  })
  it("NULL start time is always open (pre-0013 behavior)", () => {
    expect(checkInOpensAt(null)).toBeNull()
    expect(isCheckInOpen(null, START)).toBe(true)
    expect(isCheckInOpen(null, 0)).toBe(true)
  })
})

describe("self-attest fallback (30 min after start)", () => {
  it("opens exactly 30 minutes after start", () => {
    expect(selfAttestOpensAt(START)).toBe(START + SELF_ATTEST_AFTER_MINUTES * MIN)
  })
  it("is closed before +30 min, open at and after", () => {
    expect(isSelfAttestOpen(START, START)).toBe(false)
    expect(isSelfAttestOpen(START, START + 29 * MIN)).toBe(false)
    expect(isSelfAttestOpen(START, START + 30 * MIN)).toBe(true)
    expect(isSelfAttestOpen(START, START + 90 * MIN)).toBe(true)
  })
  it("NULL start time is never available (undefinable window)", () => {
    expect(selfAttestOpensAt(null)).toBeNull()
    expect(isSelfAttestOpen(null, START)).toBe(false)
  })
})
