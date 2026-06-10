import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BOOKING_COLUMNS, mapBooking, type RawBooking } from "@/lib/bookings"
import { joinedFullName } from "@/lib/emt"
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
    .select("verified, available")
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
      userId={user.id}
      bookings={bookings}
    />
  )
}
