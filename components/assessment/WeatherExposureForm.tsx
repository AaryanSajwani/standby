"use client"

import { ChevronDown } from "lucide-react"
import type { AssessmentFormData } from "@/types/assessment"
import { Button } from "@/components/ui/button"

interface WeatherExposureFormProps {
  formData: AssessmentFormData
  onChange: (data: Partial<AssessmentFormData>) => void
  onNext: () => void
  onBack: () => void
}

const WEATHER_CONDITIONS = [
  { value: "", label: "Select expected conditions" },
  { value: "clear", label: "Clear / Sunny" },
  { value: "cloudy", label: "Partly Cloudy / Overcast" },
  { value: "rain", label: "Rain Expected" },
  { value: "heat", label: "High Heat (90°F+)" },
  { value: "cold", label: "Cold (below 40°F)" },
  { value: "variable", label: "Variable / Unknown" },
]

const PRECIP_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "low", label: "Low — less than 20% chance" },
  { value: "moderate", label: "Moderate — 20–50% chance" },
  { value: "high", label: "High — greater than 50% chance" },
]

export function WeatherExposureForm({ formData, onChange, onNext, onBack }: WeatherExposureFormProps) {
  const isValid = formData.expectedWeather && formData.highTempF && formData.precipitationRisk

  return (
    <div className="h-full flex">
      <div className="w-0.5 bg-accent-signal flex-shrink-0" />

      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-10 py-8">
          <h2 className="text-3xl font-semibold tracking-tight">Weather Exposure</h2>
          <p className="text-sm text-muted-foreground mt-3">
            Environmental conditions that affect patient presentation rates
          </p>
        </div>

        <div className="flex-1 p-10 overflow-auto">
          <div className="grid gap-10">
            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Expected Weather Conditions <span className="text-risk-high">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.expectedWeather}
                  onChange={(e) => onChange({ expectedWeather: e.target.value })}
                  className="w-full h-14 px-5 pr-12 bg-input border border-input-border text-foreground focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm appearance-none cursor-pointer"
                >
                  {WEATHER_CONDITIONS.map((w) => (
                    <option key={w.value} value={w.value} className="bg-popover">{w.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Expected High Temperature (°F) <span className="text-risk-high">*</span>
              </label>
              <input
                type="number"
                value={formData.highTempF}
                onChange={(e) => onChange({ highTempF: e.target.value })}
                placeholder="e.g., 85"
                min="-30"
                max="130"
                className="w-full h-14 px-5 bg-input border border-input-border text-foreground placeholder:text-placeholder focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {formData.highTempF && parseInt(formData.highTempF) >= 90 && (
                <div className="text-xs font-mono text-risk-high mt-2">
                  High heat — elevated heat illness risk
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Precipitation Risk <span className="text-risk-high">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.precipitationRisk}
                  onChange={(e) => onChange({ precipitationRisk: e.target.value })}
                  className="w-full h-14 px-5 pr-12 bg-input border border-input-border text-foreground focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm appearance-none cursor-pointer"
                >
                  {PRECIP_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value} className="bg-popover">{p.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border px-10 py-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBack}>Back</Button>
            <Button onClick={onNext} disabled={!isValid}>Continue to Step 4</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
