// Maps emt_profiles.cert_level DB values to display strings.
export const CERT_DISPLAY: Record<string, "First Responder" | "EMT-B" | "AEMT" | "EMT-P"> = {
  first_responder: "First Responder",
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
