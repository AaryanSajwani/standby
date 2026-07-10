"use client"

import { useState } from "react"
import { ChevronDown, MapPin } from "lucide-react"
import type { AssessmentFormData } from "@/types/assessment"
import { Button } from "@/components/ui/button"
import { geocodePlace, fetchNearestHospital, type HospitalResult } from "@/lib/geo"

interface MedicalResourcesFormProps {
  formData: AssessmentFormData
  onChange: (data: Partial<AssessmentFormData>) => void
  onNext: () => void
  onBack: () => void
}

type AutofillState = "idle" | "loading" | "filled" | "none" | "error"

const YES_NO_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
]

const MEDICAL_PLAN_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "yes", label: "Yes — plan is finalized" },
  { value: "in-progress", label: "In progress — draft exists" },
  { value: "no", label: "No — none in place" },
]

export function MedicalResourcesForm({ formData, onChange, onNext, onBack }: MedicalResourcesFormProps) {
  const isValid = formData.nearestHospitalMiles && formData.hasOnSiteAED && formData.priorMedicalPlan

  const [autofill, setAutofill] = useState<AutofillState>("idle")
  const [hospital, setHospital] = useState<HospitalResult | null>(null)
  const canAutofill = formData.venueAddress.trim().length >= 3

  // §4.3 — compute transport distance from the venue instead of asking the
  // organizer to know it. Straight-line, so it under-reads driving distance —
  // conservative for the risk engine's >10 mi factor; always user-editable.
  const handleAutofill = async () => {
    setAutofill("loading")
    const places = await geocodePlace(formData.venueAddress, 1)
    if (places.length === 0) {
      setAutofill("error")
      return
    }
    const nearest = await fetchNearestHospital(places[0].latitude, places[0].longitude)
    if (!nearest) {
      setAutofill("none")
      return
    }
    setHospital(nearest)
    onChange({ nearestHospitalMiles: String(nearest.distanceMiles) })
    setAutofill("filled")
  }

  return (
    <div className="h-full flex">
      <div className="w-0.5 bg-accent-signal flex-shrink-0" />

      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-10 py-8">
          <h2 className="text-3xl font-semibold tracking-tight">Medical Resources</h2>
          <p className="text-sm text-muted-foreground mt-3">
            Existing medical infrastructure at and near the venue
          </p>
        </div>

        <div className="flex-1 p-10 overflow-auto">
          <div className="grid gap-10">
            {/* §4.3 — nearest-hospital auto-fill */}
            <div className="border border-border bg-surface px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Hospital distance auto-fill</span>
                <p className="text-sm text-foreground">
                  {canAutofill
                    ? `Find the nearest hospital to ${formData.venueAddress}`
                    : "Add a venue (step 2) to find the nearest hospital automatically"}
                </p>
                {autofill === "filled" && hospital && (
                  <span className="text-xs font-mono text-risk-low">
                    Nearest: {hospital.name} — {hospital.distanceMiles} mi straight-line
                    {hospital.hasEmergency ? "" : " (ER not confirmed)"}. Review and adjust below.
                  </span>
                )}
                {autofill === "none" && (
                  <span className="text-xs font-mono text-muted-foreground">No hospital found within 25 mi — enter the distance manually below.</span>
                )}
                {autofill === "error" && (
                  <span className="text-xs font-mono text-muted-foreground">Couldn&apos;t find that location — enter manually below.</span>
                )}
              </div>
              <Button
                variant="outline"
                onClick={handleAutofill}
                disabled={!canAutofill || autofill === "loading"}
                className="shrink-0 font-mono text-xs uppercase tracking-wider gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                {autofill === "loading" ? "Searching…" : "Auto-fill"}
              </Button>
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Distance to Nearest Hospital (miles) <span className="text-risk-high">*</span>
              </label>
              <input
                type="number"
                value={formData.nearestHospitalMiles}
                onChange={(e) => onChange({ nearestHospitalMiles: e.target.value })}
                placeholder="e.g., 3.5"
                min="0"
                step="0.1"
                className="w-full h-14 px-5 bg-input border border-input-border text-foreground placeholder:text-placeholder focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {formData.nearestHospitalMiles && parseFloat(formData.nearestHospitalMiles) > 20 && (
                <div className="text-xs font-mono text-risk-high mt-2">
                  Remote location — extended transport times increase risk
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                AEDs Available On-Site <span className="text-risk-high">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.hasOnSiteAED}
                  onChange={(e) => onChange({ hasOnSiteAED: e.target.value })}
                  className="w-full h-14 px-5 pr-12 bg-input border border-input-border text-foreground focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm appearance-none cursor-pointer"
                >
                  {YES_NO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-popover">{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Existing Medical Action Plan <span className="text-risk-high">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.priorMedicalPlan}
                  onChange={(e) => onChange({ priorMedicalPlan: e.target.value })}
                  className="w-full h-14 px-5 pr-12 bg-input border border-input-border text-foreground focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm appearance-none cursor-pointer"
                >
                  {MEDICAL_PLAN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-popover">{o.label}</option>
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
            <Button onClick={onNext} disabled={!isValid}>Continue to Step 5</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
