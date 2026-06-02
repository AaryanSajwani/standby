"use client"

import { ChevronDown } from "lucide-react"
import type { AssessmentFormData } from "@/types/assessment"
import { Button } from "@/components/ui/button"

interface MedicalResourcesFormProps {
  formData: AssessmentFormData
  onChange: (data: Partial<AssessmentFormData>) => void
  onNext: () => void
  onBack: () => void
}

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
