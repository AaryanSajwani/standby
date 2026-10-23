import type { AssessmentFormData } from "@/types/assessment"

// ── sessionStorage keys ──────────────────────────────────────────────────────
// Form state survives the /auth round-trip (OAuth leaves the site entirely,
// so React state and URL params can't carry it).
export const ASSESSMENT_FORM_KEY = "standby_assessment_form"
export const ASSESSMENT_STEP_KEY = "standby_assessment_step"
export const BOOKING_PREFILL_KEY = "standby_booking_prefill"

// Event details handed from a completed assessment to the booking request
// form on /emt/[id]. eventType must match RequestEmt's EVENT_TYPES labels.
export interface BookingPrefill {
  eventName: string
  eventType: string
  eventDate: string
  location: string
  attendance: string
  durationHours: string
  notes: string
  // Set only when Save Report already created the canonical event (§4.2). When
  // present, the booking links by id with no string-matching; when absent (the
  // organizer skipped Save Report), the booking path find-or-creates the event.
  eventId?: string
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  "concert":             "Concert / Live Music",
  "festival":            "Festival (Multi-day)",
  "sporting-event":      "Sporting Event",
  "marathon":            "Marathon / Running Event",
  "corporate":           "Corporate Event",
  "wedding":             "Wedding / Private Event",
  "political-rally":     "Political Rally",
  "religious-gathering": "Religious Gathering",
  "trade-show":          "Trade Show / Exhibition",
  "other":               "Other",
}

// Maps assess-form event type values to the booking form's EVENT_TYPES options
export const ASSESS_TO_BOOKING_EVENT_TYPE: Record<string, string> = {
  "concert":             "Concert",
  "festival":            "Festival",
  "sporting-event":      "Sporting event",
  "marathon":            "Sporting event",
  "corporate":           "Corporate event",
  "trade-show":          "Corporate event",
  "wedding":             "Private event",
  "political-rally":     "Other",
  "religious-gathering": "Other",
  "other":               "Other",
}

// ── Scoring ──────────────────────────────────────────────────────────────────

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
// BLS tiers only — the supply Standby actually staffs (2026-07-21 repricing).
// Paramedic/ALS is never *recommended as bookable*; HIGH/CRITICAL reports carry
// an ALS-coordination advisory line in staffingBasis instead.
export type CertLevel = "EMR" | "EMT-B"

export interface AssessmentResult {
  riskScore: number
  riskLevel: RiskLevel
  rationale: string
  riskFactors: { crowd: number; environmental: number; activity: number }
  // Readiness offset added on top of the weighted factors (missing AED / plan /
  // clear access). Surfaced live in the intake RiskProfilePanel breakdown.
  penalty: number
  staffing: { emtCount: number; certLevel: CertLevel; hours: number; estimatedCost: string }
  recommendedCertLevels: CertLevel[]
  // Guideline basis for each recommendation — what makes the report "defensible" to an AHJ (§4.5)
  staffingBasis: string[]
  // Derived AFTER riskLevel and never fed back into any score — saved reports
  // must re-score identically whether or not they carry the transport fields.
  transport: TransportAssessment
}

// ── Patient transport ────────────────────────────────────────────────────────
// Standby staffs on-site BLS providers; it does NOT provide ambulances or
// patient transport. Default model: medics stabilize, 911 / local EMS transports.

// PROVISIONAL — pending Aaryan / medical-director review. One place to tune.
// Exported so /methodology documents the same numbers (ACTIVITY_RISK pattern).
export const TRANSPORT_THRESHOLDS = {
  attendance: 10_000,     // at/above → dedicated unit recommended
  hospitalMiles: 10,      // above → dedicated unit recommended (matches the env factor's >10 mi)
} as const

export type TransportRecommendation = "EMS_911" | "DEDICATED_UNIT"
export type TransportStatus = "OK" | "GAP" | "ACTION_NEEDED" | "UNSPECIFIED"

export interface TransportAssessment {
  recommendation: TransportRecommendation
  triggers: string[]            // human-readable reasons; [] when EMS_911
  status: TransportStatus
  hospital: { name: string | null; miles: number | null; erConfirmed: boolean | null }
  advisories: string[]          // e.g. emergency-vehicle access
}

// Organizer's answer to "Patient Transport Arrangement" (intake step 4) — one
// table for every surface (intake select, report card, booking notes) so a new
// option can't be added to one and silently missed by another.
export const TRANSPORT_PLANS = {
  "911": {
    label:    "911 / local EMS — no dedicated ambulance on site",
    noteLine: "Transport: 911 / local EMS (no dedicated unit on site)",
  },
  "contracted": {
    label:    "Dedicated ambulance contracted from a licensed provider",
    noteLine: "Transport: dedicated ambulance contracted by organizer",
  },
  "unsure": {
    label:    "Not arranged yet / not sure",
    noteLine: "Transport: not yet arranged",
  },
} as const
export type TransportPlan = keyof typeof TRANSPORT_PLANS

// transportPlan comes from user-controlled sessionStorage — own-key lookup only,
// so "constructor"/"toString" can't resolve to Object.prototype members.
export function transportPlanInfo(plan: string): (typeof TRANSPORT_PLANS)[TransportPlan] | null {
  return Object.prototype.hasOwnProperty.call(TRANSPORT_PLANS, plan) ? TRANSPORT_PLANS[plan as TransportPlan] : null
}

// The booking request form's notes textarea maxLength (app/emt/[id]/request-emt.tsx).
// bookings.notes has no DB length constraint, so this is the effective cap.
export const BOOKING_NOTES_MAX = 600

// Booking prefill notes — the organizer's special considerations first, then the
// transport arrangement so medics know what they're walking into. Fits within
// BOOKING_NOTES_MAX by truncating the organizer text, never the transport line.
export function buildBookingNotes(specialConsiderations: string, transportPlan: string, max = BOOKING_NOTES_MAX): string {
  const organizer = (specialConsiderations ?? "").trim()
  const line = transportPlanInfo(transportPlan)?.noteLine ?? ""
  const budget = line ? max - line.length - 2 : max
  const fitted =
    organizer.length > budget ? `${organizer.slice(0, Math.max(0, budget - 1)).trimEnd()}…` : organizer
  if (!line) return fitted
  return fitted ? `${fitted}\n\n${line}` : line
}

function assessTransport(form: AssessmentFormData, riskLevel: RiskLevel, attendance: number): TransportAssessment {
  // Treat parsed miles the same way the environmental factor does (>10 mi → +1)
  const hospitalMiles = parseFloat(form.nearestHospitalMiles)

  const triggers: string[] = []
  if (riskLevel === "HIGH" || riskLevel === "CRITICAL") triggers.push(`${riskLevel} risk profile`)
  if (attendance >= TRANSPORT_THRESHOLDS.attendance) triggers.push(`${attendance.toLocaleString("en-US")} expected attendees`)
  if ((hospitalMiles || 0) > TRANSPORT_THRESHOLDS.hospitalMiles) triggers.push(`nearest hospital ${hospitalMiles} mi away`)

  const recommendation: TransportRecommendation = triggers.length > 0 ? "DEDICATED_UNIT" : "EMS_911"

  // "" (or any unrecognized/legacy value) reads as not specified
  const plan = form.transportPlan ?? ""
  const status: TransportStatus =
    plan === "contracted" ? "OK" :
    plan === "911" ? (recommendation === "EMS_911" ? "OK" : "GAP") :
    plan === "unsure" ? "ACTION_NEEDED" : "UNSPECIFIED"

  const advisories: string[] = []
  if (form.accessRoutesClear === "no") {
    advisories.push("Emergency vehicle access is not confirmed. Designate an ambulance staging point and a clear access/egress route before the event, or 911 response will be delayed.")
  } else if (form.accessRoutesClear === "limited") {
    advisories.push("Emergency vehicle access is limited. Identify an ambulance staging point and confirm the route with venue security.")
  }
  if (form.nearestHospitalHasER === "unconfirmed") {
    advisories.push("The nearest hospital's emergency department could not be confirmed. Verify the closest ER-capable facility in the medical plan.")
  }

  return {
    recommendation,
    triggers,
    status,
    hospital: {
      name: (form.nearestHospitalName ?? "").trim() || null,
      miles: Number.isFinite(hospitalMiles) ? hospitalMiles : null,
      erConfirmed:
        form.nearestHospitalHasER === "yes" ? true :
        form.nearestHospitalHasER === "unconfirmed" ? false : null,
    },
    advisories,
  }
}

// Exported so the public /methodology page documents the exact same weights the engine uses
export const ACTIVITY_RISK: Record<string, number> = {
  "marathon": 9, "sporting-event": 8, "festival": 7, "concert": 7,
  "political-rally": 6, "other": 4, "religious-gathering": 4,
  "trade-show": 3, "corporate": 2, "wedding": 2,
}

const COVERAGE_HOURS: Record<string, number> = {
  "marathon": 10, "festival": 12, "concert": 6, "sporting-event": 8,
  "corporate": 6, "wedding": 6, "political-rally": 6,
  "religious-gathering": 4, "trade-show": 8, "other": 6,
}

// Posted-rate bands — keep in sync with the pricing section and the
// onboarding rate hint (ui-conventions skill → "Pricing model").
const CERT_RATE_RANGE: Record<CertLevel, [number, number]> = {
  "EMR":   [20, 28],
  "EMT-B": [20, 40],
}

const clamp10 = (n: number) => Math.min(10, Math.max(1, Math.round(n)))

export function isAssessmentComplete(form: AssessmentFormData): boolean {
  return Boolean(form.eventName && form.eventType && form.expectedAttendance)
}

export function scoreAssessment(form: AssessmentFormData): AssessmentResult {
  const attendance = parseInt(form.expectedAttendance) || 0

  // Crowd risk — size, crowd-energy event types, security posture
  let crowd =
    attendance < 200 ? 2 :
    attendance < 500 ? 3 :
    attendance < 2000 ? 5 :
    attendance < 10000 ? 7 :
    attendance < 50000 ? 8 : 9
  if (form.eventType === "festival" || form.eventType === "political-rally") crowd += 1
  if (form.hasSecurityPresence === "no") crowd += 1
  crowd = clamp10(crowd)

  // Environmental risk — exposure, weather, heat, hospital distance
  let environmental = 2
  if (form.isOutdoor === "yes") environmental += 3
  if (form.isOutdoor === "mixed") environmental += 2
  if (form.expectedWeather === "heat" || form.expectedWeather === "cold") environmental += 2
  if (form.expectedWeather === "rain" || form.expectedWeather === "variable") environmental += 1
  if ((parseInt(form.highTempF) || 0) >= 90) environmental += 1
  if (form.precipitationRisk === "high") environmental += 1
  if ((parseFloat(form.nearestHospitalMiles) || 0) > 10) environmental += 1
  environmental = clamp10(environmental)

  // Activity risk — physical intensity of the event itself
  const activity = clamp10(ACTIVITY_RISK[form.eventType] ?? 4)

  // Readiness penalty — missing resources raise the composite score
  let penalty = 0
  if (form.hasOnSiteAED === "no") penalty += 0.5
  if (form.priorMedicalPlan === "no") penalty += 0.5
  if (form.accessRoutesClear === "no") penalty += 1
  if (form.accessRoutesClear === "limited") penalty += 0.5

  const riskScore = clamp10(crowd * 0.4 + environmental * 0.3 + activity * 0.3 + penalty)

  const riskLevel: RiskLevel =
    riskScore <= 3 ? "LOW" :
    riskScore <= 5 ? "MODERATE" :
    riskScore <= 8 ? "HIGH" : "CRITICAL"

  // Staffing recommendation — EMT-B is the highest tier Standby staffs.
  // EMR only for small low-risk events; everything else gets EMT-B, and
  // HIGH/CRITICAL adds the ALS advisory below.
  const certLevel: CertLevel =
    riskLevel === "LOW" && attendance < 300 ? "EMR" : "EMT-B"

  const recommendedCertLevels: CertLevel[] =
    certLevel === "EMR" ? ["EMR", "EMT-B"] : ["EMT-B"]

  let emtCount = Math.max(1, Math.ceil(attendance / 750))
  if (riskLevel === "HIGH") emtCount = Math.max(2, emtCount)
  if (riskLevel === "CRITICAL") emtCount = Math.max(3, emtCount + 1)
  emtCount = Math.min(emtCount, 12)

  const hours = COVERAGE_HOURS[form.eventType] ?? 6
  const [lo, hi] = CERT_RATE_RANGE[certLevel]
  const estimatedCost = `$${(emtCount * hours * lo).toLocaleString()}–$${(emtCount * hours * hi).toLocaleString()}`

  const typeLabel = (EVENT_TYPE_LABELS[form.eventType] ?? "event").toLowerCase()
  const exposure = form.isOutdoor === "yes" ? " with significant outdoor exposure" : ""
  const rationale =
    `Based on your ${typeLabel} with ${attendance.toLocaleString()} expected attendees${exposure}, ` +
    `your event falls into the ${riskLevel.toLowerCase()} risk category. Events of this profile ` +
    `commonly require ${emtCount} ${certLevel} ${emtCount === 1 ? "professional" : "professionals"} ` +
    `for approximately ${hours} hours of coverage.`

  const transport = assessTransport(form, riskLevel, attendance)

  // Each line ties a recommendation to its basis — the paper trail an AHJ can check.
  const staffingBasis = [
    `Risk weighting combines crowd (${crowd}/10), environmental (${environmental}/10), and activity (${activity}/10) exposure — the factor structure used in mass-gathering patient-presentation models (e.g., Arbon, Hartman).`,
    `${emtCount} ${certLevel} ${emtCount === 1 ? "professional" : "professionals"} recommended: coverage scaled to ${attendance.toLocaleString()} expected attendees, consistent with NAEMSP mass-gathering EMS guidance on personnel ratios.`,
    riskLevel === "HIGH" || riskLevel === "CRITICAL"
      ? "This risk profile typically warrants advanced life support (ALS) capability on site or on rapid standby. Standby staffs BLS-level providers (EMR, EMT-B) — coordinate paramedic/ALS coverage through your local EMS agency as part of medical-director review."
      : "Basic life support coverage is appropriate for this risk profile; escalate to ALS if attendance, acuity, or crowd density increase.",
    transport.recommendation === "DEDICATED_UNIT"
      ? `Transport: a dedicated transport unit on site or on standby is recommended (${transport.triggers.join("; ")}). Contract it through a licensed ambulance provider and confirm unit level and staging in medical-director review. Standby does not provide ambulances or patient transport.`
      : "Transport: on-site providers stabilize; patient transport via 911 / local EMS to the nearest emergency department. Standby does not provide ambulances or patient transport.",
    // Must stay the LAST line (medical-director disclaimer).
    "This is decision support, not a medical order — review and sign-off by a qualified medical director is required before the event.",
  ]

  return {
    riskScore,
    riskLevel,
    rationale,
    riskFactors: { crowd, environmental, activity },
    penalty,
    staffing: { emtCount, certLevel, hours, estimatedCost },
    recommendedCertLevels,
    staffingBasis,
    transport,
  }
}
