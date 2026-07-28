// Maps emt_profiles.cert_level DB values to display strings. EMR + EMT-B are
// the tiers Standby recruits (2026-07-21); aemt/emt_p mappings stay so any
// legacy DB row still renders its true certification instead of lying.
export const CERT_DISPLAY: Record<string, "EMR" | "EMT-B" | "AEMT" | "EMT-P"> = {
  first_responder: "EMR",
  emt_b:           "EMT-B",
  aemt:            "AEMT",
  emt_p:           "EMT-P",
}

// Columns safe to expose on public marketplace surfaces.
// NEVER add license_number, license_state, license_expiry, or
// cert_document_path here — credential PII stays server-side and is
// only written during onboarding, never read back client-side.
export const EMT_PUBLIC_COLUMNS =
  "user_id, cert_level, hourly_rate, service_radius_miles, city, state, specializations, available, bio, verified"

// Extracts full_name from a Supabase FK join, which the untyped client
// may infer as an object or an array depending on the relationship.
export function joinedFullName(rel: unknown): string | null {
  const obj = Array.isArray(rel) ? rel[0] : rel
  return (obj as { full_name?: string | null } | null)?.full_name ?? null
}

// Human label for a raw cert_level DB value ("emt_b" → "EMT-B"). Falls back to
// the raw value so a legacy/unknown tier still renders something truthful.
export function certLabel(certLevel: string | null | undefined): string | null {
  if (!certLevel) return null
  return CERT_DISPLAY[certLevel] ?? certLevel
}

// Look up cert_level for a set of EMT user_ids in one query. bookings.emt_id
// references auth.users (not emt_profiles), so organizer booking views can't
// PostgREST-join to it — they resolve cert here instead. cert_level is in
// EMT_PUBLIC_COLUMNS (public-read for verified rows), so no credential PII is
// touched. Returns a Map keyed by user_id; missing/unverified ids are absent.
export async function fetchCertLevels(
  supabase: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  emtIds: string[]
): Promise<Map<string, string>> {
  const ids = [...new Set(emtIds.filter(Boolean))]
  if (ids.length === 0) return new Map()
  const { data } = await supabase
    .from("emt_profiles")
    .select("user_id, cert_level")
    .in("user_id", ids)
  return new Map(
    (data ?? [])
      .filter((r: { cert_level: string | null }) => r.cert_level)
      .map((r: { user_id: string; cert_level: string }) => [r.user_id, r.cert_level])
  )
}
