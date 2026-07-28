// ─────────────────────────────────────────────────────────────────────────────
// Shift check-in verification codes (PR B / PR 3).
//
// A rotating 6-digit code proves physical co-presence at check-in. Design intent
// (from the build prompts): the code lives on the MEDIC's device; the ORGANIZER
// scans the QR (which encodes the same 6-digit value) or types it. A static code
// held by the organizer could be forwarded and faked remotely — do not invert it.
//
// Implementation: HOTP (RFC 4226) dynamic truncation over a per-booking secret,
// with the counter = floor(unixSeconds / period) so it behaves as 60-second TOTP
// (RFC 6238). The secret lives ONLY in `shift_verification_secrets` (service-role
// only) and NEVER reaches any client — the server returns just the current code
// and its expiry. The QR encodes the numeric code itself (not an otpauth:// URI),
// so there is no external-authenticator interop requirement; the secret is hashed
// as raw UTF-8 bytes.
//
// SERVER-ONLY. Uses node:crypto and handles the shared secret — must never be
// imported into a client component.
//
// ⚠ WIRING REQUIREMENT — the check-in endpoint MUST rate-limit verification
// attempts. The code space is 10^6 and a submission is accepted across a ~120s
// window (current + 1 previous), so without throttling it is brute-forceable in
// well under that window. verifyCode() is pure and cannot self-enforce this; the
// route that calls it must cap attempts per (booking, submitter) — e.g. a short
// lockout after ~5 wrong tries — in addition to the app-layer /api rate tier.
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, randomBytes, timingSafeEqual } from "crypto"

/** Code rotates every 60 seconds (build-prompts: "Rotates every 60 seconds"). */
export const CODE_PERIOD_SECONDS = 60
export const CODE_DIGITS = 6
/**
 * How many prior windows a submitted code is still accepted for. 1 = the current
 * and the immediately previous window (clock-skew / scan-lag tolerance); a code
 * from two windows ago is rejected — the PR B acceptance criterion.
 */
export const DEFAULT_ALLOWED_SKEW_STEPS = 1
/**
 * Hard upper bound on the accepted skew window, so a mis-set caller can never
 * widen the acceptance window without bound (each extra step is another 60s a
 * stale code stays valid). Clamped in verifyCode.
 */
export const MAX_ALLOWED_SKEW_STEPS = 10

/** Generate a fresh per-booking secret (160-bit, standard TOTP strength), hex-encoded. */
export function generateSecret(): string {
  return randomBytes(20).toString("hex")
}

function counterAt(unixSeconds: number): number {
  return Math.floor(unixSeconds / CODE_PERIOD_SECONDS)
}

// HOTP: HMAC-SHA1(secret, counter) → dynamic-truncation → zero-padded digits.
function hotp(secret: string, counter: number, digits = CODE_DIGITS): string {
  const buf = Buffer.alloc(8)
  // 64-bit big-endian counter. Split to stay within 32-bit bitwise ops.
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buf.writeUInt32BE(counter >>> 0, 4)

  const hmac = createHmac("sha1", Buffer.from(secret, "utf8")).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const mod = 10 ** digits
  return String(binary % mod).padStart(digits, "0")
}

/** The code valid at a given instant (defaults to server "now"). */
export function generateCode(secret: string, atUnixSeconds: number = nowSeconds()): string {
  return hotp(secret, counterAt(atUnixSeconds))
}

export interface CurrentCode {
  code: string
  /** Unix seconds when this code stops being the current one. */
  expiresAt: number
  /** Whole seconds remaining on the current code. */
  secondsRemaining: number
}

/** The current code plus when it rolls over — the payload the server returns to the medic's page. */
export function currentCode(secret: string, atUnixSeconds: number = nowSeconds()): CurrentCode {
  const counter = counterAt(atUnixSeconds)
  const expiresAt = (counter + 1) * CODE_PERIOD_SECONDS
  return {
    code: hotp(secret, counter),
    expiresAt,
    secondsRemaining: expiresAt - atUnixSeconds,
  }
}

function safeDigitsEqual(a: string, b: string): boolean {
  // Constant-time compare, but only for equal-length all-ASCII digit strings.
  // A length mismatch is an immediate reject (never an exception).
  if (a.length !== b.length) return false
  const ab = Buffer.from(a, "utf8")
  const bb = Buffer.from(b, "utf8")
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export interface VerifyOptions {
  /** Prior windows still accepted (see DEFAULT_ALLOWED_SKEW_STEPS). */
  allowedSkewSteps?: number
  atUnixSeconds?: number
}

/**
 * Verify a submitted code against the current window and up to `allowedSkewSteps`
 * previous windows. Non-numeric / wrong-length submissions reject cleanly (never
 * throw). With the default skew of 1, a code from two windows ago is rejected.
 */
export function verifyCode(secret: string, submitted: string, options: VerifyOptions = {}): boolean {
  const { allowedSkewSteps = DEFAULT_ALLOWED_SKEW_STEPS, atUnixSeconds = nowSeconds() } = options

  // Accept only real strings; any other type (number, object, null) rejects
  // cleanly rather than throwing on .trim() — the header's "never throw" contract.
  const normalized = typeof submitted === "string" ? submitted.trim() : ""
  if (!new RegExp(`^\\d{${CODE_DIGITS}}$`).test(normalized)) return false

  const counter = counterAt(atUnixSeconds)
  const steps = Math.min(MAX_ALLOWED_SKEW_STEPS, Math.max(0, Math.floor(allowedSkewSteps)))
  for (let back = 0; back <= steps; back++) {
    const c = counter - back
    if (c < 0) break
    if (safeDigitsEqual(hotp(secret, c), normalized)) return true
  }
  return false
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}
