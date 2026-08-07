// ─────────────────────────────────────────────────────────────────────────────
// Slot fill — the ONE validated path that assigns a medic to a booking (Phase 2).
//
// Invariant (staffing-slots skill #1): both fill entry points converge here —
//   • OPEN-CLAIM  (organizer accepts an application): open   → accepted
//   • DIRECT-INVITE (medic accepts a held invitation): invited → accepted
// so the validation lives in ONE place and can't drift between the two routes.
//
// This module is PURE (no I/O, no Supabase, no clock): the route fetches the
// booking row, the medic's emt_profile, and the medic's other committed bookings,
// then calls planFill() with already-fetched data. That keeps every rule unit-
// testable without a database, and lets the route apply the returned plan under
// the service role. The route MUST still re-fetch-and-write under a row lock /
// guarded `.eq("status", …)` so a concurrent fill can't double-book (staffing-
// slots #2/#4) — planFill validates, it does not serialize.
//
// Distinct, catchable errors map to real UI copy (never a generic toast):
//   SLOT_NOT_AVAILABLE · MEDIC_NOT_VERIFIED · CERT_EXPIRES_BEFORE_EVENT ·
//   MEDIC_DOUBLE_BOOKED
// ─────────────────────────────────────────────────────────────────────────────

export type FillSource = "application" | "invitation"

export type FillError =
  | "SLOT_NOT_AVAILABLE" // slot isn't fillable, or the invite is addressed to someone else
  | "MEDIC_NOT_VERIFIED" // emt_profiles.verified is false / missing
  | "CERT_EXPIRES_BEFORE_EVENT" // license lapses on or before the shift date
  | "MEDIC_DOUBLE_BOOKED" // medic already holds a committed shift overlapping this one

/** The booking being filled (only the fields fill validation needs). */
export interface SlotForFill {
  status: string
  invited_emt_id: string | null
  starts_at: string | null // ISO timestamptz, or null (date-only booking)
  event_date: string // YYYY-MM-DD (always present)
  duration_hours: number
}

/** The candidate medic's emt_profile (server-fetched; credential PII stays server-side). */
export interface MedicForFill {
  verified: boolean
  license_expiry: string // YYYY-MM-DD
  hourly_rate: number // dollars (posted rate)
}

/** One of the medic's OTHER bookings, for overlap detection. */
export interface MedicBooking {
  status: string
  starts_at: string | null
  event_date: string
  duration_hours: number
}

export interface FillPlan {
  emt_id: string
  /** Snapshot of the medic's posted rate at fill, in integer cents. */
  rate_cents: number
  fromStatus: "open" | "invited"
  toStatus: "accepted"
}

export type FillResult = { ok: true; plan: FillPlan } | { ok: false; error: FillError }

// A medic is "committed" (and thus blocks an overlapping fill) only once they have
// actually accepted. pending (awaiting the medic) and invited (a held offer) are
// NOT commitments, so they never trigger a double-book.
const COMMITTED_STATUSES: ReadonlySet<string> = new Set(["accepted", "confirmed", "checked_in"])

/** Start instant of a booking: the explicit start, else midnight of its event date. */
function startOf(b: { starts_at: string | null; event_date: string }): number {
  return new Date(b.starts_at ?? `${b.event_date}T00:00:00Z`).getTime()
}

/** [start, end) window in ms, end = start + duration. */
function windowOf(b: { starts_at: string | null; event_date: string; duration_hours: number }): [number, number] {
  const start = startOf(b)
  return [start, start + Math.max(0, b.duration_hours) * 3_600_000]
}

/** Half-open overlap: [aStart,aEnd) ∩ [bStart,bEnd) ≠ ∅. Touching edges do NOT overlap. */
function overlaps(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1]
}

/** The date the shift starts, as YYYY-MM-DD (for the cert-validity comparison). */
function slotDate(slot: { starts_at: string | null; event_date: string }): string {
  return slot.starts_at ? slot.starts_at.slice(0, 10) : slot.event_date
}

/**
 * Validations 4–7 of the spec's _fill_slot (verified · cert-valid-at-start ·
 * no overlapping committed shift), shared by BOTH invite-time and fill-time so
 * the rules can't drift. Returns the first failing error, or null if eligible.
 * The slot-status/invitation-target check is caller-specific and lives in
 * planFill (fill) or the invite route (invite).
 */
export function checkMedicEligibility(
  shift: { starts_at: string | null; event_date: string; duration_hours: number },
  medic: MedicForFill | null,
  otherBookings: MedicBooking[]
): FillError | null {
  if (!medic || !medic.verified) return "MEDIC_NOT_VERIFIED"
  if (medic.license_expiry < slotDate(shift)) return "CERT_EXPIRES_BEFORE_EVENT"
  const win = windowOf(shift)
  for (const other of otherBookings) {
    if (COMMITTED_STATUSES.has(other.status) && overlaps(win, windowOf(other))) {
      return "MEDIC_DOUBLE_BOOKED"
    }
  }
  return null
}

/**
 * Validate a fill and produce the write plan, or a typed error. Pure.
 *
 * @param slot          the booking being filled (current DB row)
 * @param medic         the candidate medic's emt_profile
 * @param medicId       the medic's user id (= bookings.emt_id)
 * @param source        which path is filling — 'application' (open) or 'invitation' (invited)
 * @param otherBookings the medic's OTHER bookings (this booking excluded), for overlap
 */
export function planFill(
  slot: SlotForFill,
  medic: MedicForFill | null,
  medicId: string,
  source: FillSource,
  otherBookings: MedicBooking[]
): FillResult {
  // 1. The slot must be in the state this source fills, and an invite must be
  //    addressed to THIS medic. (Re-checked here even though it passed at invite
  //    time — staffing-slots #2: the fill-time check is the load-bearing one.)
  if (source === "application") {
    if (slot.status !== "open") return { ok: false, error: "SLOT_NOT_AVAILABLE" }
  } else {
    if (slot.status !== "invited" || slot.invited_emt_id !== medicId) {
      return { ok: false, error: "SLOT_NOT_AVAILABLE" }
    }
  }

  // 2–4. Verified · cert-valid-at-start · no overlapping committed shift.
  const ineligible = checkMedicEligibility(slot, medic, otherBookings)
  if (ineligible) return { ok: false, error: ineligible }

  // 5. Snapshot the medic's posted rate (dollars) into integer cents.
  //    medic is non-null here — checkMedicEligibility returns MEDIC_NOT_VERIFIED for null.
  const rate_cents = Math.round(medic!.hourly_rate * 100)

  return {
    ok: true,
    plan: { emt_id: medicId, rate_cents, fromStatus: slot.status as "open" | "invited", toStatus: "accepted" },
  }
}
