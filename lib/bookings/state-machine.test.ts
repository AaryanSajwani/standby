import { describe, it, expect } from "vitest"
import {
  BOOKING_STATES,
  BOOKING_TRANSITIONS,
  TERMINAL_STATES,
  type BookingState,
  type TransitionActor,
  canTransition,
  assertTransition,
  findTransition,
  nextStates,
  isBookingState,
  isTerminal,
  IllegalBookingTransitionError,
  normalizeLiveState,
} from "./state-machine"

// The complete legal transition set, written out independently of the source
// module so the test is a genuine check, not a mirror of the implementation.
// Each entry is `from -> to`. Anything not listed here must be illegal.
const LEGAL: ReadonlyArray<[BookingState, BookingState]> = [
  ["draft", "open"],
  ["draft", "pending"],
  ["draft", "cancelled_organizer"],
  ["open", "accepted"],
  ["open", "invited"],
  ["open", "retired"],
  ["open", "cancelled_organizer"],
  ["open", "expired"],
  ["invited", "accepted"],
  ["invited", "open"],
  ["invited", "cancelled_organizer"],
  ["invited", "expired"],
  ["retired", "open"],
  ["pending", "accepted"],
  ["pending", "declined"],
  ["pending", "cancelled_organizer"],
  ["pending", "expired"],
  ["accepted", "confirmed"],
  ["accepted", "checked_in"],
  ["accepted", "cancelled_organizer"],
  ["accepted", "cancelled_emt"],
  ["accepted", "no_show_emt"],
  ["confirmed", "checked_in"],
  ["confirmed", "cancelled_organizer"],
  ["confirmed", "cancelled_emt"],
  ["confirmed", "no_show_emt"],
  ["checked_in", "completed"],
]

const legalSet = new Set(LEGAL.map(([f, t]) => `${f}->${t}`))

describe("booking state machine — full transition matrix", () => {
  it("accepts exactly the legal transitions and rejects every other pair", () => {
    for (const from of BOOKING_STATES) {
      for (const to of BOOKING_STATES) {
        const expected = legalSet.has(`${from}->${to}`)
        expect(canTransition(from, to), `${from} -> ${to}`).toBe(expected)
      }
    }
  })

  it("never permits a self-transition", () => {
    for (const s of BOOKING_STATES) {
      expect(canTransition(s, s)).toBe(false)
    }
  })

  it("assertTransition throws IllegalBookingTransitionError on illegal, returns the rule on legal", () => {
    expect(() => assertTransition("declined", "accepted")).toThrow(IllegalBookingTransitionError)
    expect(() => assertTransition("completed", "checked_in")).toThrow(IllegalBookingTransitionError)
    const rule = assertTransition("pending", "accepted", "emt")
    expect(rule.to).toBe("accepted")
    expect(rule.reason).toMatch(/accepted the direct request/i)
  })

  it("exposes structured error fields", () => {
    try {
      assertTransition("expired", "open", "system")
      throw new Error("should have thrown")
    } catch (e) {
      expect(e).toBeInstanceOf(IllegalBookingTransitionError)
      const err = e as IllegalBookingTransitionError
      expect(err.from).toBe("expired")
      expect(err.to).toBe("open")
      expect(err.by).toBe("system")
    }
  })
})

describe("terminal states", () => {
  const expectedTerminal: BookingState[] = [
    "completed",
    "declined",
    "cancelled_organizer",
    "cancelled_emt",
    "no_show_emt",
    "expired",
  ]

  it("has exactly the expected terminal set", () => {
    expect([...TERMINAL_STATES].sort()).toEqual([...expectedTerminal].sort())
  })

  it("terminal states have no outgoing transitions", () => {
    for (const s of expectedTerminal) {
      expect(BOOKING_TRANSITIONS[s]).toHaveLength(0)
      expect(nextStates(s)).toHaveLength(0)
      expect(isTerminal(s)).toBe(true)
    }
  })

  it("every non-terminal state can reach at least one terminal state directly or transitively", () => {
    const reaches = (start: BookingState): boolean => {
      const seen = new Set<BookingState>()
      const stack: BookingState[] = [start]
      while (stack.length) {
        const cur = stack.pop()!
        if (isTerminal(cur)) return true
        if (seen.has(cur)) continue
        seen.add(cur)
        for (const r of BOOKING_TRANSITIONS[cur]) stack.push(r.to)
      }
      return false
    }
    for (const s of BOOKING_STATES) expect(reaches(s), s).toBe(true)
  })
})

describe("actor constraints", () => {
  it("only a medic may accept or decline a direct (pending) request", () => {
    expect(canTransition("pending", "accepted", "emt")).toBe(true)
    expect(canTransition("pending", "accepted", "organizer")).toBe(false)
    expect(canTransition("pending", "declined", "emt")).toBe(true)
    expect(canTransition("pending", "declined", "system")).toBe(false)
  })

  it("only the organizer may accept a claim on an open slot (open-claim is organizer-approved)", () => {
    expect(canTransition("open", "accepted", "organizer")).toBe(true)
    expect(canTransition("open", "accepted", "emt")).toBe(false)
  })

  it("only the organizer may confirm", () => {
    expect(canTransition("accepted", "confirmed", "organizer")).toBe(true)
    expect(canTransition("accepted", "confirmed", "emt")).toBe(false)
  })

  it("organizer-cancel and emt-cancel are attributed to the right actor", () => {
    expect(canTransition("confirmed", "cancelled_organizer", "organizer")).toBe(true)
    expect(canTransition("confirmed", "cancelled_organizer", "emt")).toBe(false)
    expect(canTransition("confirmed", "cancelled_emt", "emt")).toBe(true)
    expect(canTransition("confirmed", "cancelled_emt", "organizer")).toBe(false)
  })

  it("only the system may expire a request", () => {
    expect(canTransition("pending", "expired", "system")).toBe(true)
    expect(canTransition("pending", "expired", "organizer")).toBe(false)
    expect(canTransition("open", "expired", "system")).toBe(true)
  })

  it("findTransition respects the actor filter", () => {
    expect(findTransition("pending", "accepted", "emt")).toBeDefined()
    expect(findTransition("pending", "accepted", "organizer")).toBeUndefined()
  })
})

describe("held-slot (invited) constraints — Phase 2 slots", () => {
  it("only the organizer may invite a medic to an open slot", () => {
    expect(canTransition("open", "invited", "organizer")).toBe(true)
    expect(canTransition("open", "invited", "emt")).toBe(false)
    expect(canTransition("open", "invited", "system")).toBe(false)
  })

  it("only the medic may accept a held invitation (the fill)", () => {
    expect(canTransition("invited", "accepted", "emt")).toBe(true)
    expect(canTransition("invited", "accepted", "organizer")).toBe(false)
  })

  it("a held slot reopens on decline (emt), rescind (organizer), or expiry (system)", () => {
    expect(canTransition("invited", "open", "emt")).toBe(true)
    expect(canTransition("invited", "open", "organizer")).toBe(true)
    expect(canTransition("invited", "open", "system")).toBe(true)
  })

  it("only the system may expire a held slot past event start; only the organizer may cancel it", () => {
    expect(canTransition("invited", "expired", "system")).toBe(true)
    expect(canTransition("invited", "expired", "organizer")).toBe(false)
    expect(canTransition("invited", "cancelled_organizer", "organizer")).toBe(true)
    expect(canTransition("invited", "cancelled_organizer", "emt")).toBe(false)
  })

  it("headcount retire/revive is organizer-only and reversible", () => {
    expect(canTransition("open", "retired", "organizer")).toBe(true)
    expect(canTransition("open", "retired", "emt")).toBe(false)
    expect(canTransition("retired", "open", "organizer")).toBe(true)
    expect(canTransition("retired", "open", "emt")).toBe(false)
  })

  it("invited and retired are NOT terminal (both can still move)", () => {
    expect(isTerminal("invited")).toBe(false)
    expect(isTerminal("retired")).toBe(false)
  })
})

describe("live-schema subset", () => {
  // The live DB trigger (migration 0007) enforces exactly these transitions.
  // They must all be legal here so this module can guard the shipped flow.
  it("contains the live 4-state subgraph (pending→accepted/declined, accepted→cancelled_emt)", () => {
    expect(canTransition("pending", "accepted", "emt")).toBe(true)
    expect(canTransition("pending", "declined", "emt")).toBe(true)
    expect(canTransition("accepted", "cancelled_emt", "emt")).toBe(true)
  })

  it("rejects the reversals the live trigger also rejects", () => {
    expect(canTransition("declined", "accepted")).toBe(false)
    expect(canTransition("accepted", "pending")).toBe(false)
    expect(canTransition("cancelled_emt", "accepted")).toBe(false)
  })

  it("normalizes the legacy bare `cancelled` value to cancelled_emt", () => {
    expect(normalizeLiveState("cancelled")).toBe("cancelled_emt")
    expect(normalizeLiveState("accepted")).toBe("accepted")
    expect(normalizeLiveState("not_a_state")).toBeNull()
  })
})

describe("type guards", () => {
  it("isBookingState narrows valid values and rejects junk", () => {
    expect(isBookingState("confirmed")).toBe(true)
    expect(isBookingState("cancelled")).toBe(false) // legacy alias is not a canonical state
    expect(isBookingState("")).toBe(false)
    expect(isBookingState(null)).toBe(false)
    expect(isBookingState(42)).toBe(false)
  })
})

describe("map integrity", () => {
  it("every state has an entry and every destination is a real state", () => {
    for (const s of BOOKING_STATES) {
      expect(BOOKING_TRANSITIONS[s]).toBeDefined()
      for (const rule of BOOKING_TRANSITIONS[s]) {
        expect(BOOKING_STATES).toContain(rule.to)
        expect(rule.by.length).toBeGreaterThan(0)
        const validActors: TransitionActor[] = ["organizer", "emt", "system"]
        for (const a of rule.by) expect(validActors).toContain(a)
      }
    }
  })

  it("no duplicate destination within a single state's rule list", () => {
    for (const s of BOOKING_STATES) {
      const dests = BOOKING_TRANSITIONS[s].map((r) => r.to)
      expect(new Set(dests).size).toBe(dests.length)
    }
  })
})
