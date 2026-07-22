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
  staffing: { emtCount: number; certLevel: CertLevel; hours: number; estimatedCost: string }
  recommendedCertLevels: CertLevel[]
  // Guideline basis for each recommendation — what makes the report "defensible" to an AHJ (§4.5)
  staffingBasis: string[]
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

  // Each line ties a recommendation to its basis — the paper trail an AHJ can check.
  const staffingBasis = [
    `Risk weighting combines crowd (${crowd}/10), environmental (${environmental}/10), and activity (${activity}/10) exposure — the factor structure used in mass-gathering patient-presentation models (e.g., Arbon, Hartman).`,
    `${emtCount} ${certLevel} ${emtCount === 1 ? "professional" : "professionals"} recommended: coverage scaled to ${attendance.toLocaleString()} expected attendees, consistent with NAEMSP mass-gathering EMS guidance on personnel ratios.`,
    riskLevel === "HIGH" || riskLevel === "CRITICAL"
      ? "This risk profile typically warrants advanced life support (ALS) capability on site or on rapid standby. Standby staffs BLS-level providers (EMR, EMT-B) — coordinate paramedic/ALS coverage through your local EMS agency as part of medical-director review."
      : "Basic life support coverage is appropriate for this risk profile; escalate to ALS if attendance, acuity, or crowd density increase.",
    "This is decision support, not a medical order — review and sign-off by a qualified medical director is required before the event.",
  ]

  return {
    riskScore,
    riskLevel,
    rationale,
    riskFactors: { crowd, environmental, activity },
    staffing: { emtCount, certLevel, hours, estimatedCost },
    recommendedCertLevels,
    staffingBasis,
  }
}
