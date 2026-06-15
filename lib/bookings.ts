export type BookingStatus = "pending" | "accepted" | "declined" | "cancelled"

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
}

export function formatEventDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function mapBooking(row: RawBooking, counterpartName: string): Booking {
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
  }
}
