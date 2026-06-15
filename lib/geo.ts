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
