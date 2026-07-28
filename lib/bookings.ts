// The client-facing status vocabulary. The DB (migration 0009) permits a wider
// lifecycle superset (draft/confirmed/checked_in/completed/…), but the marketplace
// surfaces only these five today. `open` is the unassigned open-claim slot
// (emt_id null) medics apply to; the rest are the direct-request lifecycle.
export type BookingStatus = "open" | "pending" | "accepted" | "declined" | "cancelled"

// Explicit column list — same allowlist convention as EMT_PUBLIC_COLUMNS.
export const BOOKING_COLUMNS =
  "id, event_name, event_type, event_date, location, expected_attendance, duration_hours, offered_rate, notes, status, created_at"

export interface RawBooking {
  id: string
  event_name: string
  event_type: string
  event_date: string
  location: string
  expected_attendance: number
  duration_hours: number
  offered_rate: number
  notes: string | null
  status: BookingStatus
  created_at: string
}

export interface Booking {
  id: string
  eventName: string
  eventType: string
  date: string
  dateISO: string // raw event_date (YYYY-MM-DD) for calendar export
  location: string
  attendance: number
  durationHours: number
  hourlyRate: number
  notes: string | null
  status: BookingStatus
  // Organizer name on the EMT dashboard; EMT name on /events
  counterpartName: string
  // The booked medic's certification level (emt_profiles.cert_level, raw DB value
  // → render via CERT_DISPLAY). Populated on organizer-facing views so the
  // EMR/EMT-B tier is visible per booking. Null on the EMT's own dashboard (the
  // counterpart there is the organizer) and on open slots (no medic yet).
  certLevel: string | null
}

export function formatEventDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function mapBooking(
  row: RawBooking,
  counterpartName: string,
  certLevel: string | null = null
): Booking {
  return {
    id: row.id,
    eventName: row.event_name,
    eventType: row.event_type,
    date: formatEventDate(row.event_date),
    dateISO: row.event_date,
    location: row.location,
    attendance: row.expected_attendance,
    durationHours: Number(row.duration_hours),
    hourlyRate: row.offered_rate,
    notes: row.notes,
    status: row.status,
    counterpartName,
    certLevel,
  }
}

// ── Open-claim: an applicant on an organizer's open slot ─────────────────────
// One row per medic who requested to fill a given open booking (migration 0011
// booking_applications, joined to the medic's public profile + emt_profiles).
// Only ever assembled for the booking's own organizer (RLS: applications
// visibility + verified-EMT public read). No credential PII — display columns
// only, same allowlist discipline as EMT_PUBLIC_COLUMNS.
export interface Applicant {
  applicationId: string
  bookingId: string
  emtId: string
  emtName: string
  status: "applied" | "accepted" | "rejected" | "withdrawn" | "expired"
  message: string | null
  createdISO: string
  // Public marketplace fields for the organizer's decision (optional — a row may
  // predate a profile field). Never license/credential fields.
  certLevel: string | null
  hourlyRate: number | null
  city: string | null
  state: string | null
}
