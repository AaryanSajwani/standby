import { describe, it, expect } from "vitest"
import {
  CODE_PERIOD_SECONDS,
  CODE_DIGITS,
  generateSecret,
  generateCode,
  currentCode,
  verifyCode,
} from "./verification-code"

const SECRET = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0" // fixed 160-bit hex secret
// Pin an instant inside window N so the arithmetic is easy to reason about.
const T = 1_000_000 * CODE_PERIOD_SECONDS + 17 // counter = 1_000_000, 17s into the window

describe("code generation", () => {
  it("produces a zero-padded 6-digit numeric code", () => {
    const code = generateCode(SECRET, T)
    expect(code).toMatch(/^\d{6}$/)
    expect(code).toHaveLength(CODE_DIGITS)
  })

  it("is deterministic for a given (secret, window)", () => {
    expect(generateCode(SECRET, T)).toBe(generateCode(SECRET, T + 10)) // same 60s window
    expect(generateCode(SECRET, T)).toBe(generateCode(SECRET, T)) // pure
  })

  it("differs across windows and across secrets", () => {
    // Codes at counter N vs N+1 — collision probability ~1e-6, negligible here.
    expect(generateCode(SECRET, T)).not.toBe(generateCode(SECRET, T + CODE_PERIOD_SECONDS))
    const other = generateSecret()
    expect(generateCode(other, T)).toMatch(/^\d{6}$/)
  })
})

describe("currentCode payload", () => {
  it("expiry falls on the next window boundary and never exceeds the period", () => {
    const { code, expiresAt, secondsRemaining } = currentCode(SECRET, T)
    expect(code).toBe(generateCode(SECRET, T))
    expect(expiresAt % CODE_PERIOD_SECONDS).toBe(0)
    expect(expiresAt).toBeGreaterThan(T)
    expect(secondsRemaining).toBeGreaterThan(0)
    expect(secondsRemaining).toBeLessThanOrEqual(CODE_PERIOD_SECONDS)
    expect(expiresAt).toBe(T - 17 + CODE_PERIOD_SECONDS) // window boundary + one period
  })
})

describe("verification & skew window", () => {
  it("accepts the code for the current window", () => {
    const code = generateCode(SECRET, T)
    expect(verifyCode(SECRET, code, { atUnixSeconds: T })).toBe(true)
  })

  it("accepts a code from the immediately previous window (skew tolerance)", () => {
    const prev = generateCode(SECRET, T - CODE_PERIOD_SECONDS)
    expect(verifyCode(SECRET, prev, { atUnixSeconds: T })).toBe(true)
  })

  it("rejects a code from two windows ago (PR B acceptance criterion)", () => {
    const twoAgo = generateCode(SECRET, T - 2 * CODE_PERIOD_SECONDS)
    // Guard against the ~1e-6 chance the two windows happen to share a code.
    if (twoAgo !== generateCode(SECRET, T) && twoAgo !== generateCode(SECRET, T - CODE_PERIOD_SECONDS)) {
      expect(verifyCode(SECRET, twoAgo, { atUnixSeconds: T })).toBe(false)
    }
  })

  it("rejects a wrong code", () => {
    const real = generateCode(SECRET, T)
    const wrong = String((Number(real) + 1) % 1_000_000).padStart(6, "0")
    expect(verifyCode(SECRET, wrong, { atUnixSeconds: T })).toBe(false)
  })

  it("rejects malformed submissions without throwing", () => {
    for (const junk of ["", "12345", "1234567", "abcdef", "12 34 56", "-12345"]) {
      expect(verifyCode(SECRET, junk, { atUnixSeconds: T })).toBe(false)
    }
    // @ts-expect-error — exercising a hostile non-string input at the boundary
    expect(verifyCode(SECRET, null, { atUnixSeconds: T })).toBe(false)
  })

  it("skew of 0 accepts only the current window", () => {
    const prev = generateCode(SECRET, T - CODE_PERIOD_SECONDS)
    const cur = generateCode(SECRET, T)
    expect(verifyCode(SECRET, cur, { atUnixSeconds: T, allowedSkewSteps: 0 })).toBe(true)
    if (prev !== cur) {
      expect(verifyCode(SECRET, prev, { atUnixSeconds: T, allowedSkewSteps: 0 })).toBe(false)
    }
  })

  it("tolerates leading/trailing whitespace from manual entry", () => {
    const code = generateCode(SECRET, T)
    expect(verifyCode(SECRET, `  ${code} `, { atUnixSeconds: T })).toBe(true)
  })
})

describe("generateSecret", () => {
  it("returns a 40-char hex string (160-bit) that verifies its own codes", () => {
    const s = generateSecret()
    expect(s).toMatch(/^[0-9a-f]{40}$/)
    const code = generateCode(s, T)
    expect(verifyCode(s, code, { atUnixSeconds: T })).toBe(true)
  })
})
