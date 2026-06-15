"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RiskScore } from "@/components/results/RiskScore"
import { StaffingCard } from "@/components/results/StaffingCard"
import { EMTProfileCard } from "@/components/results/EMTProfileCard"
import { EventSummaryPanel, type SaveState } from "@/components/results/EventSummaryPanel"
import { EMPTY_FORM_DATA, type AssessmentFormData } from "@/types/assessment"
import {
  ASSESSMENT_FORM_KEY,
  ASSESSMENT_STEP_KEY,
  BOOKING_PREFILL_KEY,
  ASSESS_TO_BOOKING_EVENT_TYPE,
  EVENT_TYPE_LABELS,
  isAssessmentComplete,
  scoreAssessment,
  type AssessmentResult,
  type BookingPrefill,
} from "@/lib/assessment"

// Sample shown when no completed assessment exists in this session
const SAMPLE_FORM: AssessmentFormData = {
  ...EMPTY_FORM_DATA,
  eventName: "Coastal Marathon 2026",
  eventType: "marathon",
  expectedAttendance: "500",
  eventDate: "2026-07-15",
  isOutdoor: "yes",
  expectedWeather: "heat",
  highTempF: "92",
  nearestHospitalMiles: "4",
  hasOnSiteAED: "yes",
  accessRoutesClear: "yes",
  hasSecurityPresence: "yes-venue",
}

const SAMPLE_EMTS = [
  { id: 1, name: "Sarah Mitchell",  certLevel: "EMT-B", yearsExperience: 4, radiusMiles: 15, available: true  },
  { id: 2, name: "Marcus Chen",     certLevel: "EMT-B", yearsExperience: 6, radiusMiles: 20, available: true  },
  { id: 3, name: "Jordan Williams", certLevel: "EMT-P", yearsExperience: 8, radiusMiles: 25, available: false },
]

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "TBD"
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  })
}

export function ResultsContent() {
  const router = useRouter()
  const [form, setForm] = useState<AssessmentFormData | null>(null)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [isSample, setIsSample] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>("idle")

  useEffect(() => {
    let formData = SAMPLE_FORM
    let sample = true
    try {
      const raw = sessionStorage.getItem(ASSESSMENT_FORM_KEY)
      if (raw) {
        const parsed = { ...EMPTY_FORM_DATA, ...JSON.parse(raw) } as AssessmentFormData
        if (isAssessmentComplete(parsed)) {
          formData = parsed
          sample = false
        }
      }
    } catch {}
    setForm(formData)
    setIsSample(sample)
    setResult(scoreAssessment(formData))
  }, [])

  if (!form || !result) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Generating report…
        </span>
      </main>
    )
  }

  const handleSaveReport = async () => {
    setSaveState("saving")
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Not signed in — form state is already in sessionStorage, so it
    // survives the OAuth round-trip and this page regenerates on return
    if (!user) {
      router.push("/auth?role=organizer&next=/results")
      return
    }

    // Find or create the canonical Event this assessment belongs to (§4.2).
    // Best-effort: if the events table is absent or errors, the assessment still
    // saves with a null event_id (prior behavior).
    let eventId: string | null = null
    const attendance = parseInt(form.expectedAttendance) || null
    const { data: existingEvent } = await supabase
      .from("events")
      .select("id")
      .eq("organizer_id", user.id)
      .eq("name", form.eventName)
      .maybeSingle()
    if (existingEvent?.id) {
      eventId = existingEvent.id
    } else {
      const { data: newEvent } = await supabase
        .from("events")
        .insert({
          organizer_id: user.id,
          name: form.eventName,
          event_type: form.eventType,
          event_date: form.eventDate || null,
          venue_address: form.venueAddress || null,
          expected_attendance: attendance,
        })
        .select("id")
        .single()
      eventId = newEvent?.id ?? null
    }

    const { error } = await supabase.from("assessments").insert({
      organizer_id: user.id,
      event_id: eventId,
      event_name: form.eventName,
      event_type: form.eventType,
      event_date: form.eventDate || null,
      expected_attendance: attendance,
      venue_address: form.venueAddress || null,
      form_data: form,
      risk_score: result.riskScore,
      risk_factors: result.riskFactors,
    })

    setSaveState(error ? "error" : "saved")
    if (error) console.error("[/results] assessment save failed:", error.message)
  }

  const handleRequestStaffing = () => {
    const prefill: BookingPrefill = {
      eventName: form.eventName,
      eventType: ASSESS_TO_BOOKING_EVENT_TYPE[form.eventType] ?? "Other",
      eventDate: form.eventDate,
      location: form.venueAddress,
      attendance: form.expectedAttendance,
      durationHours: String(result.staffing.hours),
      notes: form.specialConsiderations,
    }
    try {
      sessionStorage.setItem(BOOKING_PREFILL_KEY, JSON.stringify(prefill))
    } catch {}
    router.push(`/personnel?cert=${encodeURIComponent(result.recommendedCertLevels.join(","))}`)
  }

  const handleStartNew = () => {
    try {
      sessionStorage.removeItem(ASSESSMENT_FORM_KEY)
      sessionStorage.removeItem(ASSESSMENT_STEP_KEY)
    } catch {}
    router.push("/assess")
  }

  // PDF export via the browser print dialog — print CSS flips to a light theme and
  // hides app chrome, so "Save as PDF" yields a clean AHJ-ready document (§4.6)
  const handleDownload = () => window.print()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:px-8">
        {/* Print-only report header */}
        <div className="hidden print:flex items-center justify-between mb-6 pb-4 border-b border-border">
          <span className="font-mono text-sm font-semibold tracking-tight">STANDBY</span>
          <span className="font-mono text-xs text-muted-foreground">
            Event Medical Risk Assessment · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>

        {isSample && (
          <div className="border border-border bg-surface px-4 py-3 flex items-center gap-3 mb-8 print:hidden">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">
              Sample report
            </span>
            <div className="flex-1 h-px bg-border" />
            <span className="font-mono text-xs text-muted-foreground shrink-0">
              Run an assessment to generate your own
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block print:gap-0">
          {/* Left Column - Main Report */}
          <div className="lg:col-span-2 space-y-10">
            <header>
              <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase mb-3">
                Your Event Risk Assessment
              </p>
              <h1 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl lg:text-6xl font-medium text-foreground text-balance">
                {form.eventName}
              </h1>
            </header>

            <RiskScore score={result.riskScore} level={result.riskLevel} />

            <section className="border border-border bg-card p-6">
              <h2 className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase mb-4">
                Operational Rationale
              </h2>
              <p className="text-foreground/90 leading-relaxed text-lg">
                {result.rationale}
              </p>
            </section>

            <StaffingCard
              emtCount={result.staffing.emtCount}
              certLevel={result.staffing.certLevel}
              hours={result.staffing.hours}
              estimatedCost={result.staffing.estimatedCost}
            />

            {/* Guideline basis — the paper trail that makes the report defensible to an AHJ (§4.5) */}
            <section className="border border-border bg-card p-6">
              <h2 className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase mb-4">
                Guideline basis
              </h2>
              <ul className="flex flex-col gap-3">
                {result.staffingBasis.map((line, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground/80 leading-relaxed">
                    <span className="font-mono text-xs text-primary tabular-nums shrink-0 mt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/methodology"
                className="inline-block mt-4 font-mono text-xs uppercase tracking-wider text-primary hover:underline print:hidden"
              >
                See full methodology →
              </Link>
            </section>

            {/* Primary loop action — the whole product thesis in one click (§4.1) */}
            <div className="border border-primary/40 bg-primary/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs uppercase tracking-widest text-primary">Next step</span>
                <p className="text-foreground font-medium">
                  {isSample
                    ? "Run your own assessment to staff a real event"
                    : `Staff this event with ${result.staffing.emtCount} ${result.staffing.certLevel} ${result.staffing.emtCount === 1 ? "professional" : "professionals"}`}
                </p>
              </div>
              <Button
                onClick={isSample ? handleStartNew : handleRequestStaffing}
                className="font-mono text-xs uppercase tracking-wider px-6 shrink-0"
              >
                {isSample ? "Run assessment" : "Staff this event"}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <section className="print:hidden">
              <h2 className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase mb-6">
                Available Personnel
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SAMPLE_EMTS.map((emt) => (
                  <EMTProfileCard
                    key={emt.id}
                    name={emt.name}
                    certLevel={emt.certLevel}
                    yearsExperience={emt.yearsExperience}
                    radiusMiles={emt.radiusMiles}
                    available={emt.available}
                    onRequestStaffing={handleRequestStaffing}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Right Column - Sticky Summary */}
          <div className="lg:col-span-1 print:mt-8">
            <div className="lg:sticky lg:top-8 print:static">
              <EventSummaryPanel
                eventName={form.eventName}
                eventType={EVENT_TYPE_LABELS[form.eventType] ?? form.eventType}
                eventDate={formatDisplayDate(form.eventDate)}
                attendance={parseInt(form.expectedAttendance) || 0}
                riskFactors={result.riskFactors}
                onSaveReport={handleSaveReport}
                saveState={saveState}
                saveDisabled={isSample}
                onStartNew={handleStartNew}
                onDownload={handleDownload}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
