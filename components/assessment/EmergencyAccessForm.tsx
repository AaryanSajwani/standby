"use client"

import { ChevronDown } from "lucide-react"
import type { AssessmentFormData } from "@/types/assessment"

interface EmergencyAccessFormProps {
  formData: AssessmentFormData
  onChange: (data: Partial<AssessmentFormData>) => void
  onNext: () => void
  onBack: () => void
}

const ACCESS_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "yes", label: "Yes — clear vehicle access to venue" },
  { value: "limited", label: "Limited — restricted or shared access" },
  { value: "no", label: "No — vehicle access is blocked" },
]

const SECURITY_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "yes-dedicated", label: "Yes — dedicated security team" },
  { value: "yes-venue", label: "Yes — venue security only" },
  { value: "no", label: "No — no security planned" },
]

export function EmergencyAccessForm({ formData, onChange, onNext, onBack }: EmergencyAccessFormProps) {
  const isValid = formData.accessRoutesClear && formData.hasSecurityPresence

  return (
    <div className="h-full flex">
      <div className="w-0.5 bg-accent-signal flex-shrink-0" />

      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-10 py-8">
          <h2 className="text-3xl font-semibold tracking-tight">Emergency Access</h2>
          <p className="text-sm text-muted-foreground mt-3">
            Access conditions and security coverage for emergency response
          </p>
        </div>

        <div className="flex-1 p-10 overflow-auto">
          <div className="grid gap-10">
            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Emergency Vehicle Access Routes <span className="text-risk-high">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.accessRoutesClear}
                  onChange={(e) => onChange({ accessRoutesClear: e.target.value })}
                  className="w-full h-14 px-5 pr-12 bg-input border border-input-border text-foreground focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm appearance-none cursor-pointer"
                >
                  {ACCESS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-popover">{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Security Personnel <span className="text-risk-high">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.hasSecurityPresence}
                  onChange={(e) => onChange({ hasSecurityPresence: e.target.value })}
                  className="w-full h-14 px-5 pr-12 bg-input border border-input-border text-foreground focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm appearance-none cursor-pointer"
                >
                  {SECURITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-popover">{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Special Considerations
              </label>
              <textarea
                value={formData.specialConsiderations}
                onChange={(e) => onChange({ specialConsiderations: e.target.value })}
                placeholder="Any known hazards, crowd control challenges, or site-specific notes…"
                rows={4}
                className="w-full px-5 py-4 bg-input border border-input-border text-foreground placeholder:text-placeholder focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm resize-none"
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
              Submit Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
