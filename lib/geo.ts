// Free, keyless geo helpers (Open-Meteo) for the assessment flow.
// Geocoding + weather both run client-side from the form; no API key, CORS-enabled.

export interface GeoResult {
  label: string // "Austin, Texas, US"
  latitude: number
  longitude: number
}

// Open-Meteo geocoding — place/city search. Returns [] on any failure (best-effort).
export async function geocodePlace(query: string, count = 5): Promise<GeoResult[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
    `&count=${count}&language=en&format=json`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? [])
      .filter((r: { latitude?: number; longitude?: number }) => typeof r.latitude === "number" && typeof r.longitude === "number")
      .map((r: { name: string; admin1?: string; country_code?: string; latitude: number; longitude: number }) => ({
        label: [r.name, r.admin1, r.country_code].filter(Boolean).join(", "),
        latitude: r.latitude,
        longitude: r.longitude,
      }))
  } catch {
    return []
  }
}

export type WeatherCondition = "clear" | "cloudy" | "rain" | "heat" | "cold" | "variable"

export interface WeatherResult {
  highTempF: number
  precipChance: number // 0–100
  condition: WeatherCondition
}

// Open-Meteo daily forecast for a single date. Forecast horizon is ~16 days;
// returns null for dates outside that window (caller keeps manual entry).
export async function fetchWeather(lat: number, lng: number, dateISO: string): Promise<WeatherResult | null> {
  if (!dateISO) return null
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=temperature_2m_max,precipitation_probability_max,weather_code` +
    `&temperature_unit=fahrenheit&timezone=auto&start_date=${dateISO}&end_date=${dateISO}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const daily = (await res.json())?.daily
    if (!daily?.time?.length) return null
    const highTempF = Math.round(daily.temperature_2m_max?.[0] ?? NaN)
    if (Number.isNaN(highTempF)) return null
    const precipChance = Math.round(daily.precipitation_probability_max?.[0] ?? 0)
    const code: number = daily.weather_code?.[0] ?? 0
    const condition: WeatherCondition =
      highTempF >= 90 ? "heat" :
      highTempF < 40 ? "cold" :
      code >= 51 ? "rain" :          // WMO codes 51+ = drizzle/rain/snow/showers
      code >= 1 && code <= 3 ? "cloudy" :
      code === 0 ? "clear" : "variable"
    return { highTempF, precipChance, condition }
  } catch {
    return null
  }
}

export function precipBand(chance: number): "low" | "moderate" | "high" {
  return chance < 20 ? "low" : chance <= 50 ? "moderate" : "high"
}

// ── Nearest hospital (Overpass / OpenStreetMap) ─────────────────────────────
// Same free-keyless-CORS profile as Open-Meteo. Distance is straight-line
// (haversine), not driving — callers must label it as such; it feeds the risk
// engine's >10 mi transport-distance factor, which straight-line approximates
// conservatively (driving distance is only ever longer).

export interface HospitalResult {
  name: string
  distanceMiles: number // straight-line, 1 decimal
  hasEmergency: boolean // OSM emergency=yes tag — ER presence confirmed in OSM
}

const EARTH_RADIUS_MI = 3958.8

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(a))
}

// Public Overpass endpoints, tried in order. The main instance filters some
// non-browser clients (406) and all of them rate-limit (429), so failover across
// mirrors is standard practice for Overpass apps.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
]

async function queryHospitals(lat: number, lng: number, radiusMeters: number): Promise<HospitalResult[]> {
  // Overpass truncates `out ... N` by element id, NOT distance, so the result cap
  // is only safe when the radius is small enough that the true nearest is inside
  // an untruncated response — hence the two-stage search in fetchNearestHospital.
  const query =
    `[out:json][timeout:10];` +
    `(node(around:${radiusMeters},${lat},${lng})[amenity=hospital];` +
    `way(around:${radiusMeters},${lat},${lng})[amenity=hospital];);` +
    `out center tags 100;`

  let data: { elements?: unknown[] } | null = null
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          // Overpass usage policy wants an identifying UA. Browsers silently drop
          // this (forbidden header) and send their own — which also satisfies it;
          // this line matters for any server-side / test invocation.
          "User-Agent": "standby-assessment/1.0 (callstandby.org)",
        },
        body: `data=${encodeURIComponent(query)}`,
      })
      if (!res.ok) continue
      data = await res.json()
      break
    } catch {
      continue // network/CORS failure — try the next mirror
    }
  }
  if (!data) return []
  return ((data.elements ?? []) as Array<{
    lat?: number
    lon?: number
    center?: { lat: number; lon: number }
    tags?: { name?: string; emergency?: string }
  }>)
    .map((e) => {
      const hLat = e.lat ?? e.center?.lat
      const hLon = e.lon ?? e.center?.lon
      if (typeof hLat !== "number" || typeof hLon !== "number") return null
      return {
        name: e.tags?.name ?? "Unnamed hospital",
        distanceMiles: Math.round(haversineMiles(lat, lng, hLat, hLon) * 10) / 10,
        hasEmergency: e.tags?.emergency === "yes",
      }
    })
    .filter((h): h is HospitalResult => h !== null)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
}

// Nearest hospital to the venue, preferring ones OSM confirms have an emergency
// department. Two-stage: 10 km first (dense areas — small radius keeps the
// response untruncated so the true nearest is present), widening to 40 km
// (~25 mi) only when the close search is empty (rural). Returns null on any
// failure or if none found (best-effort — caller keeps manual entry).
export async function fetchNearestHospital(lat: number, lng: number): Promise<HospitalResult | null> {
  try {
    let hospitals = await queryHospitals(lat, lng, 10_000)
    if (hospitals.length === 0) hospitals = await queryHospitals(lat, lng, 40_000)
    if (hospitals.length === 0) return null
    // Prefer the nearest ER-confirmed hospital; fall back to nearest of any kind
    return hospitals.find((h) => h.hasEmergency) ?? hospitals[0]
  } catch {
    return null
  }
}
