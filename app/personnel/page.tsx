import { createClient } from "@/lib/supabase/server"
import StaffingMarketplace from "@/components/marketplace/StaffingMarketplace"
import type { EMTCardProps } from "@/components/ui/emt-card"
import { CERT_DISPLAY, EMT_PUBLIC_COLUMNS, joinedFullName } from "@/lib/emt"

export const metadata = { title: "Personnel — Standby" }

// Never statically cache — newly verified EMTs must appear immediately
export const dynamic = "force-dynamic"

export default async function PersonnelPage() {
  const supabase = await createClient()

  const { data: rawEmts, error } = await supabase
    .from("emt_profiles")
    .select(`${EMT_PUBLIC_COLUMNS}, profiles!inner ( full_name )`)
    .eq("verified", true)
    .order("created_at", { ascending: false })

  // A failed query must not masquerade as "no verified EMTs yet"
  if (error) console.error("[/personnel] emt_profiles query failed:", error.message)

  const verifiedEmts: EMTCardProps[] = (rawEmts ?? []).map((row) => {
    const fullName = joinedFullName(row.profiles) ?? "Unknown EMT"

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
