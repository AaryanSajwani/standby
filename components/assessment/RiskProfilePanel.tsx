"use client"

import { useMemo, useState, useEffect } from "react"
import { scoreAssessment, type RiskLevel } from "@/lib/assessment"
import type { AssessmentFormData } from "@/types/assessment"

interface RiskProfilePanelProps {
  formData: AssessmentFormData
}

const LEVEL_COLOR: Record<RiskLevel, string> = {
  LOW: "text-risk-low",
  MODERATE: "text-risk-medium",
  HIGH: "text-risk-high",
  CRITICAL: "text-risk-critical",
}

// Score only makes sense once the two primary drivers are present; before that
// the engine's clamped floor (~3) would read as a real number and mislead.
function hasCore(form: AssessmentFormData): boolean {
  return Boolean(form.eventType && form.expectedAttendance)
}

export function RiskProfilePanel({ formData }: RiskProfilePanelProps) {
  // The live number: the SAME engine that runs on /results, recomputed on every
  // keystroke across all five steps — not a step-1-only preview.
  const result = useMemo(
    () => (hasCore(formData) ? scoreAssessment(formData) : null),
    [formData],
  )

  // Which of the four scoring dimensions have data yet — drives the "building"
  // state so the breakdown fills in as the organizer advances through the tabs.
  const crowdActive = Boolean(formData.expectedAttendance)
  const activityActive = Boolean(formData.eventType)
  const envActive = Boolean(
    formData.isOutdoor ||
      formData.expectedWeather ||
      formData.highTempF ||
      formData.precipitationRisk ||
      formData.nearestHospitalMiles,
  )
  const readyActive = Boolean(
    formData.hasOnSiteAED ||
      formData.priorMedicalPlan ||
      formData.accessRoutesClear ||
      formData.hasSecurityPresence,
  )
  const completedDims = [crowdActive, activityActive, envActive, readyActive].filter(Boolean).length

  const level = result ? LEVEL_COLOR[result.riskLevel] : "text-muted-foreground"

  const [assessmentId, setAssessmentId] = useState("STB-000000")
  useEffect(() => {
    setAssessmentId(`STB-${Date.now().toString(36).toUpperCase().slice(-6)}`)
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            Risk Profile
          </span>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 ${i < completedDims ? "bg-accent-functional" : "bg-border"}`}
                />
              ))}
            </div>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {completedDims}/4
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-auto">
        {/* Main Score Display */}
        <div className="border border-border p-8 mb-8">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Live Risk Score
          </div>

          {/* Scanning Line Animation */}
          <div className="h-px w-full bg-border mb-8 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-functional to-transparent animate-scan" />
          </div>

          <div className="flex items-baseline gap-3">
            <span
              className={`text-[80px] leading-none font-mono font-light tabular-nums transition-colors duration-300 ${
                result ? level : "text-muted-foreground/20"
              }`}
            >
              {result ? result.riskScore : "—"}
            </span>
            <span className="text-muted-foreground font-mono text-2xl">/10</span>
          </div>
          <div className={`text-sm font-mono mt-6 tracking-widest ${level}`}>
            {result ? `${result.riskLevel} RISK` : "AWAITING DATA"}
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/70 mt-4 leading-relaxed">
            {result
              ? "Updates as you complete each step."
              : "Enter event type and expected attendance to begin scoring."}
          </p>
        </div>

        {/* Data Grid - Step 1 snapshot */}
        <div className="grid grid-cols-2 border border-border">
          <DataCell label="Event" value={formData.eventName || "—"} truncate />
          <DataCell
            label="Type"
            value={formData.eventType ? formData.eventType.replace("-", " ").toUpperCase() : "—"}
          />
          <DataCell
            label="Attendance"
            value={formData.expectedAttendance ? parseInt(formData.expectedAttendance).toLocaleString() : "—"}
            highlight={(parseInt(formData.expectedAttendance) || 0) >= 10000}
          />
          <DataCell label="Date" value={formData.eventDate ? formatDate(formData.eventDate) : "—"} />
        </div>

        {/* Risk Factors — the live engine breakdown, filling in per step */}
        <div className="mt-8 border border-border">
          <div className="border-b border-border px-5 py-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Risk Factors
            </span>
          </div>
          <div className="p-5 space-y-4">
            <RiskFactor
              label="Crowd Density"
              hint="Step 1"
              value={result ? `${result.riskFactors.crowd}/10` : "—"}
              active={crowdActive}
            />
            <RiskFactor
              label="Event Activity"
              hint="Step 1"
              value={result ? `${result.riskFactors.activity}/10` : "—"}
              active={activityActive}
            />
            <RiskFactor
              label="Environmental"
              hint="Steps 2–4"
              value={result ? `${result.riskFactors.environmental}/10` : "—"}
              active={envActive}
            />
            <RiskFactor
              label="Readiness Offset"
              hint="Steps 4–5"
              value={result ? (result.penalty > 0 ? `+${result.penalty}` : "+0") : "—"}
              active={readyActive}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono text-muted-foreground">
            ID: <span className="text-foreground">{assessmentId}</span>
          </div>
          <div className="text-[11px] font-mono text-muted-foreground">
            STATUS:{" "}
            <span className={completedDims === 4 ? "text-risk-low" : "text-risk-medium"}>
              {completedDims === 4 ? "ALL FACTORS IN" : result ? "SCORING LIVE" : "IN PROGRESS"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DataCell({
  label,
  value,
  truncate = false,
  highlight = false,
}: {
  label: string
  value: string
  truncate?: boolean
  highlight?: boolean
}) {
  const isEmpty = value === "—"

  return (
    <div className="p-5 border-b border-r border-border last:border-r-0 [&:nth-child(2)]:border-r-0 [&:nth-child(4)]:border-r-0 [&:nth-child(3)]:border-b-0 [&:nth-child(4)]:border-b-0">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </div>
      <div
        className={`font-mono text-sm tabular-nums transition-all duration-200 ${
          isEmpty ? "text-muted-foreground/30" : highlight ? "text-risk-medium" : "text-foreground"
        } ${truncate ? "truncate" : ""}`}
        title={truncate && !isEmpty ? value : undefined}
      >
        {value}
      </div>
    </div>
  )
}

function RiskFactor({
  label,
  hint,
  value,
  active,
}: {
  label: string
  hint: string
  value: string
  active: boolean
}) {
  const isEmpty = value === "—"

  return (
    <div className="flex items-center justify-between">
      <span className="flex items-baseline gap-2">
        <span className={`text-sm transition-colors duration-200 ${active ? "text-foreground" : "text-muted-foreground/60"}`}>
          {label}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">
          {hint}
        </span>
      </span>
      <span
        className={`font-mono text-sm tabular-nums transition-all duration-200 ${
          isEmpty ? "text-muted-foreground/30" : active ? "text-foreground" : "text-muted-foreground/60"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date
      .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      .toUpperCase()
  } catch {
    return dateString
  }
}
