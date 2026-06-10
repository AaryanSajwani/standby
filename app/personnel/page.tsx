import { createClient } from "@/lib/supabase/server"
import StaffingMarketplace from "@/components/marketplace/StaffingMarketplace"
import type { EMTCardProps } from "@/components/ui/emt-card"
import { CERT_DISPLAY, EMT_PUBLIC_COLUMNS } from "@/lib/emt"

export const metadata = { title: "Personnel — Standby" }

export default async function PersonnelPage() {
  const supabase = await createClient()

  const { data: rawEmts } = await supabase
    .from("emt_profiles")
    .select(`${EMT_PUBLIC_COLUMNS}, profiles!inner ( full_name )`)
    .eq("verified", true)
    .order("created_at", { ascending: false })

  const verifiedEmts: EMTCardProps[] = (rawEmts ?? []).map((row) => {
    const profile = row.profiles as { full_name: string | null } | null
    const fullName = profile?.full_name ?? "Unknown EMT"

    return {
      id:            row.user_id,
      name:          fullName,
      certification: CERT_DISPLAY[row.cert_level] ?? "EMT-B",
      hourlyRate:    row.hourly_rate ?? 0,
      radiusMiles:   row.service_radius_miles ?? 0,
      available:     row.available ?? false,
      eventTypes:    Array.isArray(row.specializations) ? row.specializations : [],
      verified:      true,
    }
  })

  return <StaffingMarketplace verifiedEmts={verifiedEmts} />
}
