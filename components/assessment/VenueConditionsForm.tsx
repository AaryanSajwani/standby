"use client"

import { ChevronDown } from "lucide-react"
import type { AssessmentFormData } from "@/types/assessment"

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

            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Venue Address or Landmark <span className="text-risk-high">*</span>
              </label>
              <input
                type="text"
                value={formData.venueAddress}
                onChange={(e) => onChange({ venueAddress: e.target.value })}
                placeholder="e.g., Zilker Park, Austin TX"
                className="w-full h-14 px-5 bg-input border border-input-border text-foreground placeholder:text-placeholder focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border px-10 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="h-10 px-6 text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              Back
            </button>
            <button
              onClick={onNext}
              disabled={!isValid}
              className={`h-10 px-6 text-sm font-medium border transition-colors ${
                isValid
                  ? "bg-foreground text-background border-foreground hover:bg-foreground/90"
                  : "bg-muted text-muted-foreground border-border cursor-not-allowed"
              }`}
            >
              Continue to Step 3
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
