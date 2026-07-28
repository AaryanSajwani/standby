// Review dimensions (PR B). Each is scored 1–5, alongside a 1–5 overall and
// optional text. Deliberately NO clinical-competence dimension — an organizer
// can't assess patient care, and a public rating of a licensed EMT's clinical
// skill is a liability artifact (build-prompts). author_role drives which set
// applies: an organizer rates the medic; a medic rates the organizer.

export interface Dimension {
  key: string
  label: string
}

// author_role = 'organizer' → rating the medic.
export const ORGANIZER_RATES_MEDIC: readonly Dimension[] = [
  { key: "punctuality", label: "Punctuality" },
  { key: "professionalism", label: "Professionalism" },
  { key: "communication", label: "Communication" },
  { key: "preparedness", label: "Preparedness" },
]

// author_role = 'emt' → rating the organizer.
export const MEDIC_RATES_ORGANIZER: readonly Dimension[] = [
  { key: "site_as_described", label: "Site as described" },
  { key: "communication", label: "Communication" },
  { key: "site_safety", label: "Site safety" },
  { key: "logistics_support", label: "Logistics support" },
]

export function dimensionsFor(authorRole: "organizer" | "emt"): readonly Dimension[] {
  return authorRole === "organizer" ? ORGANIZER_RATES_MEDIC : MEDIC_RATES_ORGANIZER
}

/** True when every dimension key for `authorRole` is present and an integer 1–5. */
export function validSubscores(authorRole: "organizer" | "emt", subscores: Record<string, unknown>): boolean {
  const dims = dimensionsFor(authorRole)
  return dims.every((d) => {
    const v = subscores[d.key]
    return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5
  })
}

export function isValidOverall(overall: unknown): overall is number {
  return typeof overall === "number" && Number.isInteger(overall) && overall >= 1 && overall <= 5
}
