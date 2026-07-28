import { describe, it, expect } from "vitest"
import {
  ORGANIZER_RATES_MEDIC,
  MEDIC_RATES_ORGANIZER,
  dimensionsFor,
  validSubscores,
  isValidOverall,
} from "./dimensions"

describe("dimensionsFor", () => {
  it("returns the medic-facing set for an organizer author", () => {
    expect(dimensionsFor("organizer")).toBe(ORGANIZER_RATES_MEDIC)
    expect(dimensionsFor("organizer").map((d) => d.key)).toEqual([
      "punctuality",
      "professionalism",
      "communication",
      "preparedness",
    ])
  })
  it("returns the organizer-facing set for a medic author", () => {
    expect(dimensionsFor("emt")).toBe(MEDIC_RATES_ORGANIZER)
    expect(dimensionsFor("emt").map((d) => d.key)).toEqual([
      "site_as_described",
      "communication",
      "site_safety",
      "logistics_support",
    ])
  })
  it("has no clinical-competence dimension on either side", () => {
    const keys = [...ORGANIZER_RATES_MEDIC, ...MEDIC_RATES_ORGANIZER].map((d) => d.key)
    for (const banned of ["clinical", "competence", "patient_care", "care"]) {
      expect(keys).not.toContain(banned)
    }
  })
})

describe("isValidOverall", () => {
  it("accepts integers 1..5", () => {
    for (const n of [1, 2, 3, 4, 5]) expect(isValidOverall(n)).toBe(true)
  })
  it("rejects out-of-range, non-integer, and non-number", () => {
    for (const v of [0, 6, 2.5, -1, "3", null, undefined, NaN]) {
      expect(isValidOverall(v)).toBe(false)
    }
  })
})

describe("validSubscores", () => {
  const fullOrganizer = { punctuality: 5, professionalism: 4, communication: 5, preparedness: 3 }
  const fullMedic = { site_as_described: 4, communication: 5, site_safety: 5, logistics_support: 4 }

  it("accepts a complete, in-range set for each role", () => {
    expect(validSubscores("organizer", fullOrganizer)).toBe(true)
    expect(validSubscores("emt", fullMedic)).toBe(true)
  })
  it("rejects a missing dimension", () => {
    const { preparedness, ...missing } = fullOrganizer
    void preparedness
    expect(validSubscores("organizer", missing)).toBe(false)
  })
  it("rejects out-of-range or non-integer scores", () => {
    expect(validSubscores("organizer", { ...fullOrganizer, punctuality: 6 })).toBe(false)
    expect(validSubscores("organizer", { ...fullOrganizer, communication: 2.5 })).toBe(false)
    expect(validSubscores("organizer", { ...fullOrganizer, preparedness: 0 })).toBe(false)
  })
  it("ignores extra keys as long as the required ones are valid", () => {
    expect(validSubscores("emt", { ...fullMedic, bogus: 99 })).toBe(true)
  })
})
