// ─────────────────────────────────────────────────────────────────────────────
// Booking state machine — the ONE place booking transitions are defined.
//
// Per standby-build-prompts.md (PR A) and standby-payments-full-spec.md (PR 1):
// "Put the legal transition map in a const object … That module is the ONLY
// place transitions are written. Illegal transitions throw. Unit test the full
// matrix." Server code (and any future DB trigger) should defer to this map so
// there is a single source of truth for what a booking may do next.
//
// ── Two entry paths, one lifecycle (product decision: SUPPORT BOTH) ───────────
// A booking can begin in EITHER of two ways, then both converge on `accepted`:
//
//   1. DIRECT-REQUEST (the shipped flow). An organizer picks a specific VERIFIED
//      EMT and files a `pending` booking (emt_id already set; migrations 0007/0008).
//      The medic answers:  pending → accepted (medic says yes) | declined.
//
//   2. OPEN-CLAIM, ORGANIZER-APPROVED (added). An organizer posts a slot with no
//      medic (`open`, emt_id null). Verified medics REQUEST to fill it — those
//      requests are rows in `booking_applications` (migration 0011), NOT booking
//      status changes, so MANY medics can apply to one slot. The organizer then
//      picks one applicant, which sets the booking's emt_id and moves it
//      open → accepted (organizer-initiated). Sibling applications are rejected.
//      The application lifecycle itself lives in lib/bookings/applications.ts.
//
// So `accepted` = "both sides have said yes; shift is on" regardless of path.
// Downstream is shared: accepted → (optional) confirmed → checked_in → completed,
// with cancel/no-show/expiry branches (PR B check-in + completion states).
//
// The live 0007 4-state subset (pending→accepted|declined, accepted→cancelled) is
// a strict subgraph of this map (see the test), so this module guards the shipped
// flow today and the full flow once migrations 0009 (lifecycle) + 0011
// (applications) are applied. Payment-only states (released/refunded/disputed) are
// intentionally NOT modeled here — those belong to a payments-phase machine.
//
// This module is pure (no I/O, no DB, no client/server coupling) so it is unit-
// testable without a running Supabase instance.
// ─────────────────────────────────────────────────────────────────────────────

export const BOOKING_STATES = [
  "draft", // organizer is assembling the request; not yet visible to any medic
  "open", // posted as an open slot, no medic yet (open-claim model)
  "invited", // organizer invited a specific medic; slot HELD awaiting their reply (Phase 2 slots)
  "pending", // sent directly to a chosen medic, awaiting their answer (LIVE model)
  "accepted", // medic accepted/claimed; shift is on but not yet organizer-confirmed
  "confirmed", // organizer confirmed the medic; locked in for both sides
  "checked_in", // medic verified physically on site (PR B)
  "completed", // shift finished / checked out (PR B) — reviews attach here
  "declined", // medic declined a direct request (terminal)
  "cancelled_organizer", // organizer cancelled (terminal)
  "cancelled_emt", // medic backed out (terminal)
  "no_show_emt", // medic never appeared (terminal)
  "expired", // open slot / direct request went unanswered past event start (terminal)
  "retired", // slot removed to reduce headcount; revivable back to open (Phase 2 slots)
] as const

export type BookingState = (typeof BOOKING_STATES)[number]

/** Who may initiate a transition. `system` = a scheduled job / trigger (e.g. expiry). */
export type TransitionActor = "organizer" | "emt" | "system"

export interface TransitionRule {
  readonly to: BookingState
  /** Roles permitted to initiate this transition. Enforced server-side, not by RLS alone. */
  readonly by: readonly TransitionActor[]
  /** Human-readable reason — seeds the `booking_state_transitions.reason` audit column. */
  readonly reason: string
}

// The legal transition map. A state whose entry is `[]` is terminal.
export const BOOKING_TRANSITIONS: Record<BookingState, readonly TransitionRule[]> = {
  draft: [
    { to: "open", by: ["organizer"], reason: "Posted as an open coverage request" },
    { to: "pending", by: ["organizer"], reason: "Sent directly to a chosen medic" },
    { to: "cancelled_organizer", by: ["organizer"], reason: "Draft discarded" },
  ],
  open: [
    // Open-claim is ORGANIZER-APPROVED: medics apply via booking_applications
    // (0011); the organizer accepts one applicant, which sets emt_id and moves the
    // booking here. Acceptance is initiated by the organizer, not an EMT self-claim.
    { to: "accepted", by: ["organizer"], reason: "Organizer accepted a medic's claim request" },
    // DIRECT-REQUEST on a slot (Phase 2): the organizer invites ONE specific medic,
    // which HOLDS the slot as `invited` until the medic replies. Distinct from
    // open→accepted (that path fills immediately from an application).
    { to: "invited", by: ["organizer"], reason: "Organizer invited a medic to the slot (held)" },
    { to: "retired", by: ["organizer"], reason: "Slot retired to reduce headcount" },
    { to: "cancelled_organizer", by: ["organizer"], reason: "Organizer withdrew the open slot" },
    { to: "expired", by: ["system"], reason: "Slot went unclaimed past event start" },
  ],
  // HELD slot (Phase 2). One live invitation at a time. The medic accepts (fills)
  // or the invitation is RELEASED back to `open` — by the medic (decline), the
  // organizer (rescind), or the system (expiry). Routes pass the precise audit
  // reason; the map's single open-bound rule keeps destinations unique (no dupes).
  invited: [
    { to: "accepted", by: ["emt"], reason: "Medic accepted the invitation" },
    { to: "open", by: ["emt", "organizer", "system"], reason: "Invitation released (declined, rescinded, or expired); slot reopened" },
    { to: "cancelled_organizer", by: ["organizer"], reason: "Organizer cancelled the held slot" },
    { to: "expired", by: ["system"], reason: "Held slot passed the event start unfilled" },
  ],
  // Parking state for a slot removed by a headcount decrease. Revivable to `open`
  // (headcount increase revives retired slots ascending before appending new ones).
  retired: [
    { to: "open", by: ["organizer"], reason: "Slot revived to increase headcount" },
  ],
  pending: [
    { to: "accepted", by: ["emt"], reason: "Medic accepted the direct request" },
    { to: "declined", by: ["emt"], reason: "Medic declined the direct request" },
    { to: "cancelled_organizer", by: ["organizer"], reason: "Organizer withdrew the request" },
    { to: "expired", by: ["system"], reason: "Request went unanswered past event start" },
  ],
  accepted: [
    // Target open-claim flow adds an explicit organizer confirm step…
    { to: "confirmed", by: ["organizer"], reason: "Organizer confirmed the medic" },
    // …while the live direct-request flow treats `accepted` as the locked state,
    // so check-in may proceed straight from here too.
    { to: "checked_in", by: ["organizer", "emt"], reason: "Medic verified on site" },
    // Phase 3 removal: the organizer unassigns the medic and the slot reopens at
    // the SAME index. Only from `accepted` — a checked_in medic cannot be
    // unassigned (that's a different problem). Notifies the removed medic.
    { to: "open", by: ["organizer"], reason: "Organizer removed the medic; slot reopened" },
    { to: "cancelled_organizer", by: ["organizer"], reason: "Organizer cancelled the shift" },
    { to: "cancelled_emt", by: ["emt"], reason: "Medic backed out of the shift" },
    { to: "no_show_emt", by: ["organizer", "system"], reason: "Medic did not appear" },
  ],
  confirmed: [
    { to: "checked_in", by: ["organizer", "emt"], reason: "Medic verified on site" },
    { to: "cancelled_organizer", by: ["organizer"], reason: "Organizer cancelled the shift" },
    { to: "cancelled_emt", by: ["emt"], reason: "Medic backed out of the shift" },
    { to: "no_show_emt", by: ["organizer", "system"], reason: "Medic did not appear" },
  ],
  checked_in: [
    { to: "completed", by: ["organizer", "emt", "system"], reason: "Shift checked out / ended" },
  ],
  completed: [],
  declined: [],
  cancelled_organizer: [],
  cancelled_emt: [],
  no_show_emt: [],
  expired: [],
}

/** States with no outgoing transitions. */
export const TERMINAL_STATES: ReadonlySet<BookingState> = new Set(
  BOOKING_STATES.filter((s) => BOOKING_TRANSITIONS[s].length === 0)
)

export function isBookingState(value: unknown): value is BookingState {
  return typeof value === "string" && (BOOKING_STATES as readonly string[]).includes(value)
}

export function isTerminal(state: BookingState): boolean {
  return TERMINAL_STATES.has(state)
}

/** The rule for `from → to` if it exists (optionally constrained to an actor). */
export function findTransition(
  from: BookingState,
  to: BookingState,
  by?: TransitionActor
): TransitionRule | undefined {
  return BOOKING_TRANSITIONS[from].find(
    (r) => r.to === to && (by === undefined || r.by.includes(by))
  )
}

/** Whether `from → to` is legal (optionally for a specific actor). */
export function canTransition(from: BookingState, to: BookingState, by?: TransitionActor): boolean {
  return findTransition(from, to, by) !== undefined
}

/** Destination states reachable from `from` (optionally for a specific actor). */
export function nextStates(from: BookingState, by?: TransitionActor): BookingState[] {
  return BOOKING_TRANSITIONS[from]
    .filter((r) => by === undefined || r.by.includes(by))
    .map((r) => r.to)
}

export class IllegalBookingTransitionError extends Error {
  constructor(
    readonly from: BookingState,
    readonly to: BookingState,
    readonly by?: TransitionActor
  ) {
    const actor = by ? ` by ${by}` : ""
    super(`Illegal booking transition: ${from} -> ${to}${actor}`)
    this.name = "IllegalBookingTransitionError"
  }
}

/**
 * Assert a transition is legal, returning its rule (so callers can record the
 * canonical reason). Throws IllegalBookingTransitionError otherwise. This is the
 * guard every server-side status write must pass through.
 */
export function assertTransition(
  from: BookingState,
  to: BookingState,
  by?: TransitionActor
): TransitionRule {
  const rule = findTransition(from, to, by)
  if (!rule) throw new IllegalBookingTransitionError(from, to, by)
  return rule
}

// ── Live-schema compatibility ────────────────────────────────────────────────
// The live `bookings.status` column uses a bare `cancelled` value. In the live
// flow the only cancel path is `accepted → cancelled`, initiated by the EMT, so
// it maps to `cancelled_emt` here. Use when reading a legacy row into this model.
export const LIVE_STATE_ALIASES: Readonly<Record<string, BookingState>> = {
  cancelled: "cancelled_emt",
}

/** Normalize a raw DB status string (incl. legacy aliases) to a BookingState, or null. */
export function normalizeLiveState(raw: string): BookingState | null {
  if (isBookingState(raw)) return raw
  return LIVE_STATE_ALIASES[raw] ?? null
}
