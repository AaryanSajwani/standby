import type { SupabaseClient } from "@supabase/supabase-js"

export interface AvailabilityDate {
  id: string
  date: string // YYYY-MM-DD
}

// Upcoming available dates for an EMT (today onward). Returns [] on any error — so the
// feature degrades gracefully if the emt_availability table isn't present yet.
export async function fetchUpcomingAvailability(
  supabase: SupabaseClient,
  emtId: string,
  limit = 60
): Promise<AvailabilityDate[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from("emt_availability")
    .select("id, date")
    .eq("emt_id", emtId)
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("[availability] query failed:", error.message)
    return []
  }
  return (data ?? []) as AvailabilityDate[]
}

// Inclusive list of YYYY-MM-DD keys between start and end. Capped at 366 days
// so a pathological drag can't spin the filter loop.
export function enumerateDays(start: string, end: string): string[] {
  const days: string[] = []
  const d = new Date(`${start}T00:00:00`)
  const stop = new Date(`${end}T00:00:00`)
  while (d <= stop && days.length < 366) {
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    )
    d.setDate(d.getDate() + 1)
  }
  return days
}

export function formatAvailabilityDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
