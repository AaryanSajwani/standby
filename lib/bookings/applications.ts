// ─────────────────────────────────────────────────────────────────────────────
// Booking applications — the OPEN-CLAIM request layer (PR A, open-claim path).
//
// In the open-claim flow an organizer posts a slot with no medic (booking.status
// = 'open', emt_id null). Verified medics REQUEST to fill it; each request is a
// `booking_applications` row (migration 0011), so MANY medics can apply to the
// same slot. The organizer reviews applicants and accepts ONE — which sets the
// booking's emt_id, moves the booking `open → accepted` (see state-machine.ts),
// and rejects every sibling request.
//
// This module is the single source of truth for an application's own lifecycle
// and for the multi-row "accept one, reject the rest" plan the server action
// executes. Pure (no I/O), so the whole thing is unit-testable. It mirrors the
// shape of lib/bookings/state-machine.ts on purpose.
// ─────────────────────────────────────────────────────────────────────────────

export const APPLICATION_STATES = [
  "applied", // medic asked to fill the open slot; awaiting the organizer
  "accepted", // organizer chose this medic (terminal for the application) — booking becomes accepted
  "rejected", // organizer chose someone else, or declined this request (terminal)
  "withdrawn", // medic pulled their own request before a decision (terminal)
  "expired", // slot filled by another / event started before a decision (terminal)
] as const

export type ApplicationState = (typeof APPLICATION_STATES)[number]

/** Who may initiate an application transition. `system` = a scheduled job / trigger. */
export type ApplicationActor = "organizer" | "emt" | "system"

export interface ApplicationTransitionRule {
  readonly to: ApplicationState
  readonly by: readonly ApplicationActor[]
  readonly reason: string
}

// Legal transitions. `applied` is the only non-terminal state.
export const APPLICATION_TRANSITIONS: Record<ApplicationState, readonly ApplicationTransitionRule[]> = {
  applied: [
    { to: "accepted", by: ["organizer"], reason: "Organizer accepted the medic's claim request" },
    { to: "rejected", by: ["organizer"], reason: "Organizer chose a different medic" },
    { to: "withdrawn", by: ["emt"], reason: "Medic withdrew their claim request" },
    { to: "expired", by: ["system"], reason: "Slot filled or event started before a decision" },
  ],
  accepted: [],
  rejected: [],
  withdrawn: [],
  expired: [],
}

export const APPLICATION_TERMINAL_STATES: ReadonlySet<ApplicationState> = new Set(
  APPLICATION_STATES.filter((s) => APPLICATION_TRANSITIONS[s].length === 0)
)

export function isApplicationState(value: unknown): value is ApplicationState {
  return typeof value === "string" && (APPLICATION_STATES as readonly string[]).includes(value)
}

export function isApplicationTerminal(state: ApplicationState): boolean {
  return APPLICATION_TERMINAL_STATES.has(state)
}

export function findApplicationTransition(
  from: ApplicationState,
  to: ApplicationState,
  by?: ApplicationActor
): ApplicationTransitionRule | undefined {
  return APPLICATION_TRANSITIONS[from].find(
    (r) => r.to === to && (by === undefined || r.by.includes(by))
  )
}

export function canApplicationTransition(
  from: ApplicationState,
  to: ApplicationState,
  by?: ApplicationActor
): boolean {
  return findApplicationTransition(from, to, by) !== undefined
}

export class IllegalApplicationTransitionError extends Error {
  constructor(
    readonly from: ApplicationState,
    readonly to: ApplicationState,
    readonly by?: ApplicationActor
  ) {
    const actor = by ? ` by ${by}` : ""
    super(`Illegal application transition: ${from} -> ${to}${actor}`)
    this.name = "IllegalApplicationTransitionError"
  }
}

export function assertApplicationTransition(
  from: ApplicationState,
  to: ApplicationState,
  by?: ApplicationActor
): ApplicationTransitionRule {
  const rule = findApplicationTransition(from, to, by)
  if (!rule) throw new IllegalApplicationTransitionError(from, to, by)
  return rule
}

// ── Accept-one-reject-the-rest planning ──────────────────────────────────────

export interface ApplicationRow {
  id: string
  status: ApplicationState
}

export interface AcceptancePlan {
  /** The application the organizer accepted. */
  acceptId: string
  /** Sibling applications that were still `applied` and are now rejected. */
  rejectIds: string[]
  /** The booking status change this acceptance drives (state-machine.ts governs it). */
  bookingTransition: { from: "open"; to: "accepted" }
}

/**
 * Given all applications on one open booking and the id the organizer is
 * accepting, produce the exact multi-row plan the server action must apply in a
 * single transaction: accept the chosen `applied` request, reject every OTHER
 * still-`applied` request, and move the booking open → accepted.
 *
 * Throws if the target isn't present or isn't in `applied` (you can't accept a
 * withdrawn/expired/already-decided request). Already-terminal siblings are left
 * untouched — only `applied` ones are rejected — so the plan is idempotent-safe.
 */
export function planAcceptance(applications: ApplicationRow[], acceptId: string): AcceptancePlan {
  const target = applications.find((a) => a.id === acceptId)
  if (!target) {
    throw new Error(`Cannot accept application ${acceptId}: not found on this booking`)
  }
  assertApplicationTransition(target.status, "accepted", "organizer")
  const rejectIds = applications
    .filter((a) => a.id !== acceptId && a.status === "applied")
    .map((a) => a.id)
  return { acceptId, rejectIds, bookingTransition: { from: "open", to: "accepted" } }
}
