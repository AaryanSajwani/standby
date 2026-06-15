"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, MapPin } from "lucide-react"
import type { AssessmentFormData } from "@/types/assessment"
import { Button } from "@/components/ui/button"
import { geocodePlace, type GeoResult } from "@/lib/geo"

interface VenueConditionsFormProps {
  formData: AssessmentFormData
  onChange: (data: Partial<AssessmentFormData>) => void
  onNext: () => void
  onBack: () => void
}

const VENUE_TYPES = [
  { value: "", label: "Select venue type" },
  { value: "indoor-arena", label: "Indoor Arena / Convention Center" },
  { value: "outdoor-park", label: "Outdoor Park / Field" },
  { value: "stadium", label: "Stadium / Amphitheater" },
  { value: "fairgrounds", label: "Fairgrounds / Expo Center" },
  { value: "street", label: "Street / Public Space" },
  { value: "private-property", label: "Private Property" },
  { value: "other", label: "Other" },
]

const OUTDOOR_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "yes", label: "Yes — predominantly outdoors" },
  { value: "no", label: "No — indoors or covered" },
  { value: "mixed", label: "Mixed — indoor and outdoor areas" },
]

export function VenueConditionsForm({ formData, onChange, onNext, onBack }: VenueConditionsFormProps) {
  const isValid = formData.venueType && formData.isOutdoor && formData.venueAddress

  // Venue autocomplete (free Open-Meteo geocoding). Manual typing still works.
  const [query, setQuery] = useState(formData.venueAddress)
  const [suggestions, setSuggestions] = useState<GeoResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const skipNext = useRef(false)

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false
      return
    }
    const q = query.trim()
    if (q.length < 3) {
      setSuggestions([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      const results = await geocodePlace(q)
      setSuggestions(results)
      setLoading(false)
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  const selectPlace = (s: GeoResult) => {
    skipNext.current = true
    setQuery(s.label)
    onChange({ venueAddress: s.label })
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div className="h-full flex">
      <div className="w-0.5 bg-accent-signal flex-shrink-0" />

      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-10 py-8">
          <h2 className="text-3xl font-semibold tracking-tight">Venue Conditions</h2>
          <p className="text-sm text-muted-foreground mt-3">
            Physical characteristics of the event location
          </p>
        </div>

        <div className="flex-1 p-10 overflow-auto">
          <div className="grid gap-10">
            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Venue Type <span className="text-risk-high">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.venueType}
                  onChange={(e) => onChange({ venueType: e.target.value })}
                  className="w-full h-14 px-5 pr-12 bg-input border border-input-border text-foreground focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm appearance-none cursor-pointer"
                >
                  {VENUE_TYPES.map((t) => (
                    <option key={t.value} value={t.value} className="bg-popover">{t.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Outdoor Exposure <span className="text-risk-high">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.isOutdoor}
                  onChange={(e) => onChange({ isOutdoor: e.target.value })}
                  className="w-full h-14 px-5 pr-12 bg-input border border-input-border text-foreground focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm appearance-none cursor-pointer"
                >
                  {OUTDOOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-popover">{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-4 relative">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Venue Address or Landmark <span className="text-risk-high">*</span>
              </label>
              <input
                type="text"
                value={formData.venueAddress}
                onChange={(e) => {
                  onChange({ venueAddress: e.target.value })
                  setQuery(e.target.value)
                  setOpen(true)
                }}
                onFocus={() => formData.venueAddress.trim().length >= 3 && setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="e.g., Zilker Park, Austin TX"
                autoComplete="off"
                className="w-full h-14 px-5 bg-input border border-input-border text-foreground placeholder:text-placeholder focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm"
              />
              {open && (loading || suggestions.length > 0) && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 border border-border bg-popover max-h-60 overflow-auto">
                  {loading && (
                    <div className="px-5 py-3 font-mono text-xs text-muted-foreground">Searching…</div>
                  )}
                  {suggestions.map((s) => (
                    <button
                      key={`${s.label}-${s.latitude}-${s.longitude}`}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectPlace(s) }}
                      className="w-full text-left px-5 py-3 font-mono text-sm text-foreground hover:bg-muted flex items-center gap-2.5"
                    >
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] font-mono text-muted-foreground">
                Start typing to search — used to pull the weather forecast in the next step.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border px-10 py-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBack}>Back</Button>
            <Button onClick={onNext} disabled={!isValid}>Continue to Step 3</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
