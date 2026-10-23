import { EMPTY_FORM_DATA, type AssessmentFormData } from "@/types/assessment"

// Sample shown on /results when no completed assessment exists in this session.
// Lives outside the client component so the engine tests can pin its score.
// Scores HIGH (7/10), so with a 911-only plan it demonstrates the transport GAP
// state. Hospital distance is the manual-entry path on purpose: no name — never
// fabricate a real-looking hospital.
export const SAMPLE_ASSESSMENT_FORM: AssessmentFormData = {
  ...EMPTY_FORM_DATA,
  eventName: "Coastal Marathon 2026",
  eventType: "marathon",
  expectedAttendance: "500",
  eventDate: "2026-07-15",
  isOutdoor: "yes",
  expectedWeather: "heat",
  highTempF: "92",
  nearestHospitalMiles: "4",
  hasOnSiteAED: "yes",
  transportPlan: "911",
  accessRoutesClear: "yes",
  hasSecurityPresence: "yes-venue",
}
