"use client"

import { useMemo, useState, useEffect } from "react"

interface FormData {
  eventName: string
  eventType: string
  expectedAttendance: string
  eventDate: string
}

interface RiskProfilePanelProps {
  formData: FormData
}

const EVENT_TYPE_RISK: Record<string, number> = {
  "": 0,
  "concert": 3,
  "festival": 4,
  "sporting-event": 3,
  "marathon": 4,
  "corporate": 1,
  "wedding": 1,
  "political-rally": 4,
  "religious-gathering": 2,
  "trade-show": 2,
  "other": 2
}

function getRiskLevel(score: number): { label: string; color: string } {
  if (score === 0) return { label: "AWAITING DATA", color: "text-muted-foreground" }
  if (score <= 2) return { label: "LOW RISK", color: "text-risk-low" }
  if (score <= 4) return { label: "MODERATE RISK", color: "text-risk-medium" }
  if (score <= 6) return { label: "HIGH RISK", color: "text-risk-high" }
  return { label: "CRITICAL RISK", color: "text-risk-critical" }
}

function getAttendanceMultiplier(attendance: number): number {
  if (attendance === 0) return 0
  if (attendance < 500) return 1
  if (attendance < 2000) return 1.5
  if (attendance < 10000) return 2
  if (attendance < 50000) return 2.5
  return 3
}

export function RiskProfilePanel({ formData }: RiskProfilePanelProps) {
  const analysis = useMemo(() => {
    const attendance = parseInt(formData.expectedAttendance) || 0
    const baseRisk = EVENT_TYPE_RISK[formData.eventType] || 0
    const multiplier = getAttendanceMultiplier(attendance)
    const rawScore = baseRisk * multiplier
    const normalizedScore = Math.min(Math.round(rawScore), 10)

    return {
      baseRisk,
      multiplier,
      normalizedScore,
      attendance,
      ...getRiskLevel(normalizedScore)
    }
  }, [formData])

  const completedFields = [
    formData.eventName,
    formData.eventType,
    formData.expectedAttendance,
    formData.eventDate
  ].filter(Boolean).length

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
                  className={`w-2 h-2 ${i < completedFields ? "bg-accent-functional" : "bg-border"}`}
                />
              ))}
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {completedFields}/4
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-auto">
        {/* Main Score Display */}
        <div className="border border-border p-8 mb-8">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Preliminary Risk Score
          </div>

          {/* Scanning Line Animation */}
          <div className="h-px w-full bg-border mb-8 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-functional to-transparent animate-scan" />
          </div>

          <div className="flex items-baseline gap-3">
            <span
              className={`text-[80px] leading-none font-mono font-light tabular-nums transition-colors duration-300 ${
                analysis.normalizedScore > 0 ? analysis.color : "animate-pulse text-muted-foreground/20"
              }`}
            >
              {analysis.normalizedScore > 0 ? analysis.normalizedScore : "—"}
            </span>
            <span className="text-muted-foreground font-mono text-2xl">/10</span>
          </div>
          <div className={`text-sm font-mono mt-6 tracking-widest ${analysis.color}`}>
            {analysis.label}
          </div>
        </div>

        {/* Data Grid - Real-time updating */}
        <div className="grid grid-cols-2 border border-border">
          <DataCell
            label="Event"
            value={formData.eventName || "—"}
            truncate
          />
          <DataCell
            label="Type"
            value={formData.eventType ? formData.eventType.replace("-", " ").toUpperCase() : "—"}
          />
          <DataCell
            label="Attendance"
            value={formData.expectedAttendance ? parseInt(formData.expectedAttendance).toLocaleString() : "—"}
            highlight={analysis.attendance >= 10000}
          />
          <DataCell
            label="Date"
            value={formData.eventDate ? formatDate(formData.eventDate) : "—"}
          />
        </div>

        {/* Risk Factors - Building profile */}
        <div className="mt-8 border border-border">
          <div className="border-b border-border px-5 py-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Risk Factors
            </span>
          </div>
          <div className="p-5 space-y-4">
            <RiskFactor
              label="Base Event Risk"
              value={analysis.baseRisk > 0 ? `${analysis.baseRisk}/5` : "—"}
              active={analysis.baseRisk > 0}
            />
            <RiskFactor
              label="Crowd Multiplier"
              value={analysis.multiplier > 0 ? `×${analysis.multiplier}` : "—"}
              active={analysis.multiplier > 0}
            />
            <div className="border-t border-border pt-4 mt-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">
                Pending Assessment
              </div>
              <RiskFactor label="Venue Conditions" value="STEP 2" active={false} pending />
              <div className="h-3" />
              <RiskFactor label="Weather Exposure" value="STEP 3" active={false} pending />
              <div className="h-3" />
              <RiskFactor label="Medical Resources" value="STEP 4" active={false} pending />
              <div className="h-3" />
              <RiskFactor label="Emergency Access" value="STEP 5" active={false} pending />
            </div>
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
            STATUS: <span className={completedFields === 4 ? "text-risk-low" : "text-risk-medium"}>
              {completedFields === 4 ? "STEP 1 COMPLETE" : "IN PROGRESS"}
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
  highlight = false
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
        className={`font-mono text-sm transition-all duration-200 ${
          isEmpty
            ? "text-muted-foreground/20 animate-pulse"
            : highlight
              ? "text-risk-medium"
              : "text-foreground"
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
  value,
  active,
  pending = false
}: {
  label: string
  value: string
  active: boolean
  pending?: boolean
}) {
  const isEmpty = value === "—"

  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm transition-colors duration-200 ${active ? "text-foreground" : "text-muted-foreground/60"}`}>
        {label}
      </span>
      <span className={`font-mono text-sm transition-all duration-200 ${
        pending
          ? "text-muted-foreground/30"
          : isEmpty
            ? "text-muted-foreground/20 animate-pulse"
            : active
              ? "text-foreground"
              : "text-muted-foreground/60"
      }`}>
        {value}
      </span>
    </div>
  )
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).toUpperCase()
  } catch {
    return dateString
  }
}
