export interface AssessmentFormData {
  // Step 1 — Event Details
  eventName: string
  eventType: string
  expectedAttendance: string
  eventDate: string
  // Step 2 — Venue Conditions
  venueType: string
  isOutdoor: string
  venueAddress: string
  // Step 3 — Weather Exposure
  expectedWeather: string
  highTempF: string
  precipitationRisk: string
  // Step 4 — Medical Resources
  nearestHospitalMiles: string
  hasOnSiteAED: string
  priorMedicalPlan: string
  // Step 5 — Emergency Access
  accessRoutesClear: string
  hasSecurityPresence: string
  specialConsiderations: string
}

export const EMPTY_FORM_DATA: AssessmentFormData = {
  eventName: "", eventType: "", expectedAttendance: "", eventDate: "",
  venueType: "", isOutdoor: "", venueAddress: "",
  expectedWeather: "", highTempF: "", precipitationRisk: "",
  nearestHospitalMiles: "", hasOnSiteAED: "", priorMedicalPlan: "",
  accessRoutesClear: "", hasSecurityPresence: "", specialConsiderations: "",
}
