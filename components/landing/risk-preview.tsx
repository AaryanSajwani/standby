"use client"

import { useMemo } from "react"
import { scoreAssessment, type RiskLevel } from "@/lib/assessment"
import type { AssessmentFormData } from "@/types/assessment"

// A representative event scored by the REAL engine (lib/assessment). Nothing here
// is a hand-picked number — the score + factor breakdown are whatever the same
// model that runs on /results computes for this scenario. It's the product doing
// the real thing, not a decorative mockup.
export const EXAMPLE_ASSESSMENT: AssessmentFormData = {
  eventName: "Lakeview Summer Festival",
  eventType: "festival",
  expectedAttendance: "8500",
  eventDate: "2026-07-18",
  venueType: "outdoor-park",
  isOutdoor: "yes",
  venueAddress: "",
  expectedWeather: "heat",
  highTempF: "94",
  precipitationRisk: "low",
  nearestHospitalMiles: "8.2",
  hasOnSiteAED: "yes",
  priorMedicalPlan: "no",
  accessRoutesClear: "yes",
  hasSecurityPresence: "yes",
  specialConsiderations: "",
}

const LEVEL_COLOR: Record<RiskLevel, string> = {
  LOW: "text-risk-low",
  MODERATE: "text-risk-medium",
  HIGH: "text-risk-high",
  CRITICAL: "text-risk-critical",
}

/**
 * Compact live-score card for the hero — the real /10 scale, real factor labels,
 * real computed numbers. Replaces the old decorative /100 mockup + fake matched-EMT
 * toast. A fuller version of the same panel appears in the live-assessment section.
 */
export function HeroRiskCard() {
  const result = useMemo(() => scoreAssessment(EXAMPLE_ASSESSMENT), [])
  const level = LEVEL_COLOR[result.riskLevel]

  const factors = [
    { label: "Crowd Density", hint: "Step 1", value: `${result.riskFactors.crowd}/10` },
    { label: "Event Activity", hint: "Step 1", value: `${result.riskFactors.activity}/10` },
    { label: "Environmental", hint: "Steps 2–4", value: `${result.riskFactors.environmental}/10` },
    { label: "Readiness Offset", hint: "Steps 4–5", value: result.penalty > 0 ? `+${result.penalty}` : "+0" },
  ]

  return (
    <div className="relative border border-border bg-card rounded-xl overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Live Risk Score</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-risk-low animate-standby-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-risk-low">Live</span>
        </span>
      </div>

      {/* scan line + score */}
      <div className="px-5 pt-5 pb-4">
        <div className="h-px w-full bg-border mb-5 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-functional to-transparent animate-scan" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`font-mono font-light tabular-nums leading-none text-6xl ${level}`}>{result.riskScore}</span>
          <span className="font-mono text-xl text-muted-foreground">/10</span>
        </div>
        <div className={`font-mono text-xs mt-3 tracking-widest ${level}`}>{result.riskLevel} RISK</div>
        <p className="font-mono text-[10px] text-muted-foreground/70 mt-2 truncate">
          {EXAMPLE_ASSESSMENT.eventName} · {parseInt(EXAMPLE_ASSESSMENT.expectedAttendance).toLocaleString()} attendees
        </p>
      </div>

      {/* factors */}
      <div className="border-t border-border px-5 py-4 flex flex-col gap-2.5">
        {factors.map((f) => (
          <div key={f.label} className="flex items-center justify-between">
            <span className="flex items-baseline gap-2 min-w-0">
              <span className="text-xs text-foreground truncate">{f.label}</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40 shrink-0">{f.hint}</span>
            </span>
            <span className="font-mono text-xs tabular-nums text-foreground shrink-0">{f.value}</span>
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="border-t border-border px-5 py-3 flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">Recommended</span>
        <span className="font-mono text-[10px] text-foreground tabular-nums">{result.staffing.emtCount}× {result.staffing.certLevel}</span>
      </div>
    </div>
  )
}
