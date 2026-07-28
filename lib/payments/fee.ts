// ─────────────────────────────────────────────────────────────────────────────
// Fee model — the settled, buyer-side commission, as tested code.
//
// ⚠ PHASE 2 FOUNDATION, NOT WIRED. Per TASKS.md the transactional model is
// DECIDED (15% + $15 floor) but no payment processing ships in Phase 1, and
// ui-conventions is explicit: copy/static only, no checkout, no commission-split
// logic in the UI, never a mocked checkout with hardcoded dollars. This module
// therefore has ZERO UI/Stripe wiring — it exists so the one settled model has a
// single, tested source of truth that the pitch quotes and Phase 2 builds on,
// instead of the numbers drifting across docs. Import it into a checkout only
// once billing is actually being built.
//
// Invariants (standby-payments-full-spec.md, PR 2):
//   • Integer cents everywhere. Never float, never client-side currency math.
//   • Buyer-side: the medic receives 100% of their posted rate; the organizer
//     pays the fee ON TOP. The fee is never deducted from the medic.
//   • The floor exists because Stripe's fixed costs don't scale down; it is inert
//     above ~$100 of medic pay, i.e. nearly every real booking.
// ─────────────────────────────────────────────────────────────────────────────

/** 1500 bps = 15%. Snapshot onto the booking row at creation; do not read live. */
export const FEE_BPS = 1500
/** $15.00 floor, in cents. Snapshot onto the booking row at creation. */
export const MIN_PLATFORM_FEE_CENTS = 1500

/** Round half up to the nearest integer (banker-neutral; matches spec `round_half_up`). */
export function roundHalfUp(n: number): number {
  return Math.floor(n + 0.5)
}

export interface FeeConfig {
  feeBps?: number
  minPlatformFeeCents?: number
}

export interface BookingAmounts {
  /** Medic's full posted pay for the shift, in cents. */
  emtRateCents: number
  /** Platform service fee (buyer-side), in cents — the greater of %-fee and floor. */
  platformFeeCents: number
  /** Reserved; always 0 until the Arizona TPT question is resolved (see PR 1). */
  taxCents: number
  /** What the organizer pays: emtRate + platformFee + tax. */
  totalChargeCents: number
  /** True when the floor set the fee (i.e. the %-fee was below the floor). */
  floorEngaged: boolean
  /** Snapshotted config, so a later rate change is never retroactive. */
  feeBps: number
  minPlatformFeeCents: number
}

/**
 * Compute all amounts for a booking from the medic's posted hourly rate (in
 * cents) and the shift duration in hours. Integer-cents throughout.
 *
 *   emtRateCents     = round_half_up(hourlyRateCents · durationHours)
 *   uncappedFee      = round_half_up(emtRateCents · feeBps / 10000)
 *   platformFeeCents = max(uncappedFee, minPlatformFeeCents)
 *   totalChargeCents = emtRateCents + platformFeeCents + taxCents(0)
 */
export function computeBookingAmounts(
  hourlyRateCents: number,
  durationHours: number,
  config: FeeConfig = {}
): BookingAmounts {
  if (!Number.isFinite(hourlyRateCents) || hourlyRateCents < 0) {
    throw new RangeError(`hourlyRateCents must be a non-negative number, got ${hourlyRateCents}`)
  }
  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    throw new RangeError(`durationHours must be a positive number, got ${durationHours}`)
  }

  const feeBps = config.feeBps ?? FEE_BPS
  const minPlatformFeeCents = config.minPlatformFeeCents ?? MIN_PLATFORM_FEE_CENTS

  const emtRateCents = roundHalfUp(hourlyRateCents * durationHours)
  const uncappedFeeCents = roundHalfUp((emtRateCents * feeBps) / 10000)
  const floorEngaged = uncappedFeeCents < minPlatformFeeCents
  const platformFeeCents = Math.max(uncappedFeeCents, minPlatformFeeCents)
  const taxCents = 0
  const totalChargeCents = emtRateCents + platformFeeCents + taxCents

  return {
    emtRateCents,
    platformFeeCents,
    taxCents,
    totalChargeCents,
    floorEngaged,
    feeBps,
    minPlatformFeeCents,
  }
}

/** Format integer cents as USD, e.g. 31050 → "$310.50". Display helper only. */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  const abs = Math.abs(cents)
  // Pin the locale: the cents are joined with a literal ".", so a runtime whose
  // default locale groups with "." (e.g. de-DE → "1.234") would yield malformed
  // currency. en-US grouping keeps the decimal point unambiguous everywhere.
  const dollars = Math.floor(abs / 100).toLocaleString("en-US")
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, "0")}`
}
