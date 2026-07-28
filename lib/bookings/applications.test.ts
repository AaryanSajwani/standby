import { describe, it, expect } from "vitest"
import {
  APPLICATION_STATES,
  APPLICATION_TRANSITIONS,
  APPLICATION_TERMINAL_STATES,
  type ApplicationState,
  canApplicationTransition,
  assertApplicationTransition,
  findApplicationTransition,
  isApplicationState,
  isApplicationTerminal,
  IllegalApplicationTransitionError,
  planAcceptance,
} from "./applications"

// Independent transcription of the legal set — a real check, not a mirror.
const LEGAL: ReadonlyArray<[ApplicationState, ApplicationState]> = [
  ["applied", "accepted"],
  ["applied", "rejected"],
  ["applied", "withdrawn"],
  ["applied", "expired"],
]
const legalSet = new Set(LEGAL.map(([f, t]) => `${f}->${t}`))

describe("application state machine — matrix", () => {
  it("accepts exactly the legal transitions and rejects all others", () => {
    for (const from of APPLICATION_STATES) {
      for (const to of APPLICATION_STATES) {
        expect(canApplicationTransition(from, to), `${from} -> ${to}`).toBe(
          legalSet.has(`${from}->${to}`)
        )
      }
    }
  })

  it("has exactly one non-terminal state (applied)", () => {
    expect([...APPLICATION_TERMINAL_STATES].sort()).toEqual(
      ["accepted", "expired", "rejected", "withdrawn"].sort()
    )
    expect(isApplicationTerminal("applied")).toBe(false)
    expect(APPLICATION_TRANSITIONS.applied.length).toBe(4)
  })

  it("no self-transitions", () => {
    for (const s of APPLICATION_STATES) expect(canApplicationTransition(s, s)).toBe(false)
  })
})

describe("application actor constraints", () => {
  it("only the organizer accepts or rejects", () => {
    expect(canApplicationTransition("applied", "accepted", "organizer")).toBe(true)
    expect(canApplicationTransition("applied", "accepted", "emt")).toBe(false)
    expect(canApplicationTransition("applied", "rejected", "organizer")).toBe(true)
    expect(canApplicationTransition("applied", "rejected", "emt")).toBe(false)
  })

  it("only the medic withdraws their own request", () => {
    expect(canApplicationTransition("applied", "withdrawn", "emt")).toBe(true)
    expect(canApplicationTransition("applied", "withdrawn", "organizer")).toBe(false)
  })

  it("only the system expires a request", () => {
    expect(canApplicationTransition("applied", "expired", "system")).toBe(true)
    expect(canApplicationTransition("applied", "expired", "organizer")).toBe(false)
  })

  it("assertApplicationTransition throws on illegal, returns the rule on legal", () => {
    expect(() => assertApplicationTransition("accepted", "applied")).toThrow(
      IllegalApplicationTransitionError
    )
    const rule = assertApplicationTransition("applied", "accepted", "organizer")
    expect(rule.to).toBe("accepted")
    expect(findApplicationTransition("applied", "accepted", "emt")).toBeUndefined()
  })
})

describe("type guards", () => {
  it("isApplicationState narrows valid values", () => {
    expect(isApplicationState("applied")).toBe(true)
    expect(isApplicationState("accepted")).toBe(true)
    expect(isApplicationState("nope")).toBe(false)
    expect(isApplicationState(null)).toBe(false)
  })
})

describe("planAcceptance — accept one, reject the rest", () => {
  it("rejects every OTHER still-applied sibling and drives booking open→accepted", () => {
    const apps = [
      { id: "a", status: "applied" as const },
      { id: "b", status: "applied" as const },
      { id: "c", status: "applied" as const },
    ]
    const plan = planAcceptance(apps, "b")
    expect(plan.acceptId).toBe("b")
    expect(plan.rejectIds.sort()).toEqual(["a", "c"])
    expect(plan.bookingTransition).toEqual({ from: "open", to: "accepted" })
  })

  it("leaves already-terminal siblings untouched (only 'applied' get rejected)", () => {
    const apps = [
      { id: "a", status: "withdrawn" as const },
      { id: "b", status: "applied" as const },
      { id: "c", status: "rejected" as const },
      { id: "d", status: "applied" as const },
    ]
    const plan = planAcceptance(apps, "b")
    expect(plan.rejectIds).toEqual(["d"]) // a (withdrawn) and c (rejected) are left as-is
  })

  it("throws when accepting an unknown application", () => {
    expect(() => planAcceptance([{ id: "a", status: "applied" }], "zzz")).toThrow(/not found/i)
  })

  it("throws when accepting a request that isn't 'applied' (already decided/withdrawn)", () => {
    expect(() =>
      planAcceptance([{ id: "a", status: "withdrawn" }], "a")
    ).toThrow(IllegalApplicationTransitionError)
  })

  it("a single applicant accepted rejects nobody", () => {
    const plan = planAcceptance([{ id: "solo", status: "applied" }], "solo")
    expect(plan.rejectIds).toEqual([])
    expect(plan.acceptId).toBe("solo")
  })
})
