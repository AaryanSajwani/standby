import { createClient } from "@/lib/supabase/server"
import StaffingMarketplace from "@/components/marketplace/StaffingMarketplace"
import type { EMTCardProps } from "@/components/ui/emt-card"
import { CERT_DISPLAY, EMT_PUBLIC_COLUMNS, joinedFullName } from "@/lib/emt"

export const metadata = { title: "Personnel — Standby" }

// Never statically cache — newly verified EMTs must appear immediately
export const dynamic = "force-dynamic"

const VALID_CERT_FILTERS = ["EMT-B", "EMR"]

export default async function PersonnelPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>
}) {
  const { cert } = await searchParams
  const initialCertLevels = (cert ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => VALID_CERT_FILTERS.includes(c))

  const supabase = await createClient()

  const { data: rawEmts, error } = await supabase
    .from("emt_profiles")
    .select(`${EMT_PUBLIC_COLUMNS}, profiles!inner ( full_name )`)
    .eq("verified", true)
    .order("created_at", { ascending: false })

  // A failed query must not masquerade as "no verified EMTs yet"
  if (error) console.error("[/personnel] emt_profiles query failed:", error.message)

  // Upcoming availability for the sidebar date-range filter. RLS public-read
  // only exposes verified EMTs' rows, and the date-sane constraint bounds the
  // window to ≤2 years, so this stays a small, indexed scan. Degrades to an
  // empty map (filter matches nothing) if the table is absent.
  const today = new Date().toISOString().slice(0, 10)
  const { data: availRows, error: availError } = await supabase
    .from("emt_availability")
    .select("emt_id, date")
    .gte("date", today)
  if (availError) console.error("[/personnel] emt_availability query failed:", availError.message)

  const availabilityByEmt: Record<string, string[]> = {}
  for (const row of availRows ?? []) {
    ;(availabilityByEmt[row.emt_id] ??= []).push(row.date)
  }

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

  return (
    <StaffingMarketplace
      verifiedEmts={verifiedEmts}
      initialCertLevels={initialCertLevels}
      availabilityByEmt={availabilityByEmt}
    />
  )
}
