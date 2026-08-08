import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BOOKING_COLUMNS, mapBooking, mapInvitation, type RawBooking, type RawInvitation } from "@/lib/bookings"
import { joinedFullName } from "@/lib/emt"
import { fetchUpcomingAvailability } from "@/lib/availability"
import { DashboardContent } from "./dashboard-content"

export const metadata = { title: "EMT Dashboard — Standby" }

export default async function EMTDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth?role=emt&next=/emt-dashboard")

  // No emt_profiles row → onboarding not complete
  const { data: emtProfile } = await supabase
    .from("emt_profiles")
    .select("verified, available, cert_level, hourly_rate")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!emtProfile) redirect("/onboarding/emt")

  const { data: rawBookings, error } = await supabase
    .from("bookings")
    .select(`${BOOKING_COLUMNS}, organizer:profiles!bookings_organizer_id_fkey ( full_name )`)
    .eq("emt_id", user.id)
    .order("created_at", { ascending: false })

  if (error) console.error("[/emt-dashboard] bookings query failed:", error.message)

  const bookings = (rawBookings ?? []).map((row) =>
    mapBooking(row as unknown as RawBooking, joinedFullName(row.organizer) ?? "Organizer")
  )

  // Held invitations addressed to this medic (RLS: emt_select_invited, 0016).
  // Explicit column list — includes slot_index + invitation_expires_at, which
  // aren't in BOOKING_COLUMNS. All on the medic's own invitation row (no PII).
  const { data: rawInvites, error: inviteErr } = await supabase
    .from("bookings")
    .select(
      "id, event_name, event_type, event_date, location, expected_attendance, duration_hours, offered_rate, notes, slot_index, invitation_expires_at, organizer:profiles!bookings_organizer_id_fkey ( full_name )"
    )
    .eq("invited_emt_id", user.id)
    .eq("status", "invited")
    .order("invitation_expires_at", { ascending: true })

  if (inviteErr) console.error("[/emt-dashboard] invitations query failed:", inviteErr.message)

  const invitations = (rawInvites ?? []).map((row) =>
    mapInvitation(row as unknown as RawInvitation, joinedFullName(row.organizer) ?? "Organizer")
  )

  // 730 = the full window the date-sane constraint allows (today + 2 years) —
  // the calendar needs every upcoming date, not a preview slice
  const availability = await fetchUpcomingAvailability(supabase, user.id, 730)

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "EMT"

  return (
    <DashboardContent
      displayName={displayName}
      verified={emtProfile.verified}
      available={emtProfile.available}
      certLevel={emtProfile.cert_level ?? null}
      hourlyRate={emtProfile.hourly_rate ?? null}
      userId={user.id}
      bookings={bookings}
      invitations={invitations}
      availability={availability}
    />
  )
}
