// ─────────────────────────────────────────────────────────────────────────────
// Shift check-in timing windows (PR B follow-up).
//
// Two gates hang off the booking's start timestamp (bookings.starts_at, migration
// 0013). Both degrade gracefully when starts_at is NULL — a booking with no start
// time behaves exactly as it did before 0013: check-in is allowed any time and
// the self-attest fallback is hidden. Pure functions over epoch-millisecond
// instants so both the server (authoritative enforcement) and the client (UX
// countdown) share one source of truth; no I/O, no Date.now() captured here —
// callers pass `now`.
// ─────────────────────────────────────────────────────────────────────────────

/** Check-in opens this many minutes BEFORE the shift start. */
export const CHECK_IN_LEAD_MINUTES = 60
/**
 * Self-attest fallback opens this many minutes AFTER the shift start, once it's
 * clear the organizer isn't going to verify on time. Deliberately after start
 * (not before) — the escape hatch is for "I'm on site and the organizer is
 * unreachable," never a way to check in early.
 */
export const SELF_ATTEST_AFTER_MINUTES = 30

const MIN_MS = 60_000

/** Parse a timestamptz string (or null) to epoch millis, or null if absent/unparseable. */
export function toMillis(startsAt: string | null | undefined): number | null {
  if (!startsAt) return null
  const ms = Date.parse(startsAt)
  return Number.isFinite(ms) ? ms : null
}

/** Instant (epoch ms) at which check-in opens, or null when there's no start time. */
export function checkInOpensAt(startsAtMs: number | null): number | null {
  return startsAtMs == null ? null : startsAtMs - CHECK_IN_LEAD_MINUTES * MIN_MS
}

/**
 * Whether check-in is permitted at `nowMs`. NULL start time ⇒ always open
 * (pre-0013 behavior). Otherwise open from 60 min before start onward (no upper
 * bound — a late check-in is still a check-in).
 */
export function isCheckInOpen(startsAtMs: number | null, nowMs: number): boolean {
  const opens = checkInOpensAt(startsAtMs)
  return opens == null ? true : nowMs >= opens
}

/** Instant (epoch ms) at which the self-attest fallback opens, or null when there's no start time. */
export function selfAttestOpensAt(startsAtMs: number | null): number | null {
  return startsAtMs == null ? null : startsAtMs + SELF_ATTEST_AFTER_MINUTES * MIN_MS
}

/**
 * Whether the self-attest fallback is available at `nowMs`. Requires a known
 * start time AND that we're at least 30 min past it. NULL start time ⇒ never
 * (can't define "30 min after start" without a start).
 */
export function isSelfAttestOpen(startsAtMs: number | null, nowMs: number): boolean {
  const opens = selfAttestOpensAt(startsAtMs)
  return opens == null ? false : nowMs >= opens
}
