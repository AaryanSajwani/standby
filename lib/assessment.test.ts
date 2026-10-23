import { describe, it, expect } from "vitest"
import { EMPTY_FORM_DATA, type AssessmentFormData } from "@/types/assessment"
import {
  BOOKING_NOTES_MAX,
  TRANSPORT_THRESHOLDS,
  buildBookingNotes,
  scoreAssessment,
  transportPlanInfo,
} from "./assessment"
import { SAMPLE_ASSESSMENT_FORM } from "./sample-assessment"

const form = (p: Partial<AssessmentFormData> = {}): AssessmentFormData => ({ ...EMPTY_FORM_DATA, ...p })

// Small, indoor, fully-resourced corporate event — scores LOW (2/10) and fires
// no transport trigger on its own. Each case below changes one input from here.
const LOW_BASE = form({
  eventName: "Offsite",
  eventType: "corporate",
  expectedAttendance: "150",
  isOutdoor: "no",
  nearestHospitalMiles: "4",
  hasOnSiteAED: "yes",
  priorMedicalPlan: "yes",
  accessRoutesClear: "yes",
  hasSecurityPresence: "yes-venue",
})

describe("scoreAssessment — transport block", () => {
  it("small LOW event, hospital 4 mi, plan 911 → EMS_911 / OK, no triggers", () => {
    const r = scoreAssessment({ ...LOW_BASE, transportPlan: "911" })
    expect(r.riskLevel).toBe("LOW")
    expect(r.transport.recommendation).toBe("EMS_911")
    expect(r.transport.status).toBe("OK")
    expect(r.transport.triggers).toEqual([])
    expect(r.transport.advisories).toEqual([])
  })

  it("attendance boundary is inclusive: 10,000 triggers, 9,999 does not", () => {
    const at = scoreAssessment({ ...LOW_BASE, expectedAttendance: String(TRANSPORT_THRESHOLDS.attendance) })
    expect(at.riskLevel).toBe("MODERATE") // no risk-level trigger in play
    expect(at.transport.recommendation).toBe("DEDICATED_UNIT")
    expect(at.transport.triggers).toEqual(["10,000 expected attendees"])

    const below = scoreAssessment({ ...LOW_BASE, expectedAttendance: "9999" })
    expect(below.transport.recommendation).toBe("EMS_911")
    expect(below.transport.triggers).toEqual([])
  })

  it("hospital distance boundary is exclusive: 10.0 mi no trigger, 10.1 mi triggers", () => {
    const at = scoreAssessment({ ...LOW_BASE, nearestHospitalMiles: "10.0" })
    expect(at.transport.recommendation).toBe("EMS_911")
    expect(at.transport.triggers).toEqual([])

    const over = scoreAssessment({ ...LOW_BASE, nearestHospitalMiles: "10.1" })
    expect(over.riskLevel).toBe("LOW")
    expect(over.transport.recommendation).toBe("DEDICATED_UNIT")
    expect(over.transport.triggers).toEqual(["nearest hospital 10.1 mi away"])
  })

  it("HIGH risk + plan 911 → GAP with the risk-level trigger", () => {
    const r = scoreAssessment({ ...SAMPLE_ASSESSMENT_FORM, transportPlan: "911" })
    expect(r.riskLevel).toBe("HIGH")
    expect(r.transport.recommendation).toBe("DEDICATED_UNIT")
    expect(r.transport.triggers).toEqual(["HIGH risk profile"])
    expect(r.transport.status).toBe("GAP")
  })

  it("CRITICAL risk lists every trigger that fires, in table order", () => {
    const r = scoreAssessment(form({
      eventType: "festival", expectedAttendance: "60000", isOutdoor: "yes", expectedWeather: "heat",
      highTempF: "101", nearestHospitalMiles: "15", accessRoutesClear: "no", hasSecurityPresence: "no",
    }))
    expect(r.riskLevel).toBe("CRITICAL")
    expect(r.transport.triggers).toEqual([
      "CRITICAL risk profile",
      "60,000 expected attendees",
      "nearest hospital 15 mi away",
    ])
  })

  it("contracted → OK for either recommendation", () => {
    expect(scoreAssessment({ ...LOW_BASE, transportPlan: "contracted" }).transport.status).toBe("OK")
    const high = scoreAssessment({ ...SAMPLE_ASSESSMENT_FORM, transportPlan: "contracted" })
    expect(high.transport.recommendation).toBe("DEDICATED_UNIT")
    expect(high.transport.status).toBe("OK")
  })

  it("unsure → ACTION_NEEDED; empty → UNSPECIFIED (for either recommendation)", () => {
    expect(scoreAssessment({ ...LOW_BASE, transportPlan: "unsure" }).transport.status).toBe("ACTION_NEEDED")
    expect(scoreAssessment({ ...SAMPLE_ASSESSMENT_FORM, transportPlan: "unsure" }).transport.status).toBe("ACTION_NEEDED")
    expect(scoreAssessment({ ...LOW_BASE, transportPlan: "" }).transport.status).toBe("UNSPECIFIED")
    expect(scoreAssessment({ ...SAMPLE_ASSESSMENT_FORM, transportPlan: "" }).transport.status).toBe("UNSPECIFIED")
  })

  it("legacy form without the new keys → no throw, UNSPECIFIED, null hospital name/ER", () => {
    // Shape of a pre-transport sessionStorage / form_data row, rehydrated the way
    // the app does it: spread over EMPTY_FORM_DATA.
    const legacy: Record<string, string> = { ...LOW_BASE }
    delete legacy.nearestHospitalName
    delete legacy.nearestHospitalHasER
    delete legacy.transportPlan
    const rehydrated = { ...EMPTY_FORM_DATA, ...legacy } as AssessmentFormData

    const r = scoreAssessment(rehydrated)
    expect(r.transport.status).toBe("UNSPECIFIED")
    expect(r.transport.hospital).toEqual({ name: null, miles: 4, erConfirmed: null })
  })

  it("never throws when keys are missing outright (raw object, no EMPTY_FORM_DATA spread)", () => {
    const raw = { eventName: "x", eventType: "concert", expectedAttendance: "300" } as AssessmentFormData
    const r = scoreAssessment(raw)
    expect(r.transport.status).toBe("UNSPECIFIED")
    expect(r.transport.hospital).toEqual({ name: null, miles: null, erConfirmed: null })
  })

  it("auto-filled hospital name + ER flag flow through to the hospital block", () => {
    const yes = scoreAssessment({ ...LOW_BASE, nearestHospitalName: "General Hospital", nearestHospitalHasER: "yes" })
    expect(yes.transport.hospital).toEqual({ name: "General Hospital", miles: 4, erConfirmed: true })

    const unconfirmed = scoreAssessment({ ...LOW_BASE, nearestHospitalName: "Clinic", nearestHospitalHasER: "unconfirmed" })
    expect(unconfirmed.transport.hospital.erConfirmed).toBe(false)
    expect(unconfirmed.transport.advisories).toContain(
      "The nearest hospital's emergency department could not be confirmed. Verify the closest ER-capable facility in the medical plan.",
    )
  })

  it("transport line sits second-to-last in staffingBasis; the disclaimer stays last", () => {
    for (const f of [LOW_BASE, SAMPLE_ASSESSMENT_FORM]) {
      const basis = scoreAssessment(f).staffingBasis
      expect(basis[basis.length - 1]).toBe(
        "This is decision support, not a medical order — review and sign-off by a qualified medical director is required before the event.",
      )
      expect(basis[basis.length - 2].startsWith("Transport: ")).toBe(true)
      expect(basis[basis.length - 2]).toContain("Standby does not provide ambulances or patient transport.")
      expect(basis.filter((l) => l.startsWith("Transport: "))).toHaveLength(1)
    }
    expect(scoreAssessment(LOW_BASE).staffingBasis.at(-2)).toBe(
      "Transport: on-site providers stabilize; patient transport via 911 / local EMS to the nearest emergency department. Standby does not provide ambulances or patient transport.",
    )
    expect(scoreAssessment(SAMPLE_ASSESSMENT_FORM).staffingBasis.at(-2)).toBe(
      "Transport: a dedicated transport unit on site or on standby is recommended (HIGH risk profile). Contract it through a licensed ambulance provider and confirm unit level and staging in medical-director review. Standby does not provide ambulances or patient transport.",
    )
  })

  it("joins multiple triggers with '; ' in the DEDICATED_UNIT basis line", () => {
    const r = scoreAssessment({ ...LOW_BASE, expectedAttendance: "10000", nearestHospitalMiles: "12" })
    expect(r.staffingBasis.at(-2)).toContain("(10,000 expected attendees; nearest hospital 12 mi away)")
  })

  it("access advisories: 'no' and 'limited' each add their own line", () => {
    const no = scoreAssessment({ ...LOW_BASE, accessRoutesClear: "no" }).transport.advisories
    expect(no).toEqual([
      "Emergency vehicle access is not confirmed. Designate an ambulance staging point and a clear access/egress route before the event, or 911 response will be delayed.",
    ])
    const limited = scoreAssessment({ ...LOW_BASE, accessRoutesClear: "limited" }).transport.advisories
    expect(limited).toEqual([
      "Emergency vehicle access is limited. Identify an ambulance staging point and confirm the route with venue security.",
    ])
  })
})

// ── Regression: the transport block is derived output only ──────────────────
// Values captured from the engine immediately BEFORE the transport change
// (2026-10-22). Any drift here means transport leaked into scoring and saved
// reports would re-score differently.
describe("scoreAssessment — scoring unchanged by transport", () => {
  const FIXTURES: Record<string, AssessmentFormData> = {
    sample: SAMPLE_ASSESSMENT_FORM,
    festival8500: form({ eventName: "Lakeview Summer Festival", eventType: "festival", expectedAttendance: "8500", eventDate: "2026-07-18", venueType: "outdoor-park", isOutdoor: "yes", expectedWeather: "heat", highTempF: "94", precipitationRisk: "low", nearestHospitalMiles: "8.2", hasOnSiteAED: "yes", priorMedicalPlan: "no", accessRoutesClear: "yes", hasSecurityPresence: "yes" }),
    smallCorporate: LOW_BASE,
    criticalFestival: form({ eventName: "Mega Fest", eventType: "festival", expectedAttendance: "60000", isOutdoor: "yes", expectedWeather: "heat", highTempF: "101", precipitationRisk: "high", nearestHospitalMiles: "15", hasOnSiteAED: "no", priorMedicalPlan: "no", accessRoutesClear: "no", hasSecurityPresence: "no" }),
    concert10k: form({ eventName: "Arena Show", eventType: "concert", expectedAttendance: "10000", isOutdoor: "no", nearestHospitalMiles: "3", hasOnSiteAED: "yes", priorMedicalPlan: "yes", accessRoutesClear: "limited", hasSecurityPresence: "yes-dedicated" }),
    empty: form(),
    wedding: form({ eventName: "Barn Wedding", eventType: "wedding", expectedAttendance: "250", isOutdoor: "mixed", expectedWeather: "variable", nearestHospitalMiles: "10.1", hasOnSiteAED: "yes", priorMedicalPlan: "in-progress", accessRoutesClear: "yes", hasSecurityPresence: "no" }),
  }

  const BASELINE = {
    sample: { riskScore: 7, riskLevel: "HIGH", riskFactors: { crowd: 5, environmental: 8, activity: 9 }, penalty: 0, staffing: { emtCount: 2, certLevel: "EMT-B", hours: 10, estimatedCost: "$400–$800" }, recommendedCertLevels: ["EMT-B"] },
    festival8500: { riskScore: 8, riskLevel: "HIGH", riskFactors: { crowd: 8, environmental: 8, activity: 7 }, penalty: 0.5, staffing: { emtCount: 12, certLevel: "EMT-B", hours: 12, estimatedCost: "$2,880–$5,760" }, recommendedCertLevels: ["EMT-B"] },
    smallCorporate: { riskScore: 2, riskLevel: "LOW", riskFactors: { crowd: 2, environmental: 2, activity: 2 }, penalty: 0, staffing: { emtCount: 1, certLevel: "EMR", hours: 6, estimatedCost: "$120–$168" }, recommendedCertLevels: ["EMR", "EMT-B"] },
    criticalFestival: { riskScore: 10, riskLevel: "CRITICAL", riskFactors: { crowd: 10, environmental: 10, activity: 7 }, penalty: 2, staffing: { emtCount: 12, certLevel: "EMT-B", hours: 12, estimatedCost: "$2,880–$5,760" }, recommendedCertLevels: ["EMT-B"] },
    concert10k: { riskScore: 6, riskLevel: "HIGH", riskFactors: { crowd: 8, environmental: 2, activity: 7 }, penalty: 0.5, staffing: { emtCount: 12, certLevel: "EMT-B", hours: 6, estimatedCost: "$1,440–$2,880" }, recommendedCertLevels: ["EMT-B"] },
    empty: { riskScore: 3, riskLevel: "LOW", riskFactors: { crowd: 2, environmental: 2, activity: 4 }, penalty: 0, staffing: { emtCount: 1, certLevel: "EMR", hours: 6, estimatedCost: "$120–$168" }, recommendedCertLevels: ["EMR", "EMT-B"] },
    wedding: { riskScore: 4, riskLevel: "MODERATE", riskFactors: { crowd: 4, environmental: 6, activity: 2 }, penalty: 0, staffing: { emtCount: 1, certLevel: "EMT-B", hours: 6, estimatedCost: "$120–$240" }, recommendedCertLevels: ["EMT-B"] },
  } as const

  for (const [name, f] of Object.entries(FIXTURES)) {
    it(`${name}: score, level, factors, penalty, staffing identical to pre-transport engine`, () => {
      // Every transport input permutation must leave scoring untouched.
      for (const transportPlan of ["", "911", "contracted", "unsure"]) {
        for (const nearestHospitalHasER of ["", "yes", "unconfirmed"]) {
          const r = scoreAssessment({ ...f, transportPlan, nearestHospitalHasER, nearestHospitalName: nearestHospitalHasER ? "Some Hospital" : "" })
          expect({
            riskScore: r.riskScore,
            riskLevel: r.riskLevel,
            riskFactors: r.riskFactors,
            penalty: r.penalty,
            staffing: r.staffing,
            recommendedCertLevels: r.recommendedCertLevels,
          }).toEqual(BASELINE[name as keyof typeof BASELINE])
        }
      }
    })
  }
})

describe("buildBookingNotes", () => {
  it("transport line only, per arrangement", () => {
    expect(buildBookingNotes("", "911")).toBe("Transport: 911 / local EMS (no dedicated unit on site)")
    expect(buildBookingNotes("", "contracted")).toBe("Transport: dedicated ambulance contracted by organizer")
    expect(buildBookingNotes("", "unsure")).toBe("Transport: not yet arranged")
  })

  it("omits the line when the arrangement is unspecified", () => {
    expect(buildBookingNotes("Gate B load-in", "")).toBe("Gate B load-in")
    expect(buildBookingNotes("", "")).toBe("")
  })

  it("treats unknown / prototype-key values as unspecified (sessionStorage is user-controlled)", () => {
    for (const bogus of ["constructor", "toString", "__proto__", "ambulance"]) {
      expect(buildBookingNotes("Gate B", bogus)).toBe("Gate B")
      expect(transportPlanInfo(bogus)).toBeNull()
      expect(scoreAssessment({ ...LOW_BASE, transportPlan: bogus }).transport.status).toBe("UNSPECIFIED")
    }
    expect(transportPlanInfo("911")?.label).toBe("911 / local EMS — no dedicated ambulance on site")
  })

  it("organizer text first, blank line, then transport", () => {
    expect(buildBookingNotes("  Gate B load-in  ", "911")).toBe(
      "Gate B load-in\n\nTransport: 911 / local EMS (no dedicated unit on site)",
    )
  })

  it("truncates the organizer text, never the transport line, to fit the notes cap", () => {
    const long = "x".repeat(BOOKING_NOTES_MAX * 2)
    const out = buildBookingNotes(long, "contracted")
    expect(out.length).toBe(BOOKING_NOTES_MAX)
    expect(out.endsWith("\n\nTransport: dedicated ambulance contracted by organizer")).toBe(true)
    expect(out.startsWith("x")).toBe(true)
    expect(out).toContain("…\n\nTransport:")
  })

  it("caps organizer-only notes too, and leaves text that fits untouched", () => {
    expect(buildBookingNotes("x".repeat(BOOKING_NOTES_MAX + 50), "").length).toBe(BOOKING_NOTES_MAX)
    const fits = "y".repeat(BOOKING_NOTES_MAX - "\n\nTransport: not yet arranged".length)
    expect(buildBookingNotes(fits, "unsure")).toBe(`${fits}\n\nTransport: not yet arranged`)
  })
})
