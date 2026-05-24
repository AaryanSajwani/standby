import { RiskScore } from "@/components/results/RiskScore"
import { StaffingCard } from "@/components/results/StaffingCard"
import { EMTProfileCard } from "@/components/results/EMTProfileCard"
import { EventSummaryPanel } from "@/components/results/EventSummaryPanel"

export const metadata = {
  title: "Assessment Results — Standby",
}

// Sample data — in production this comes from the assessment form submission
const assessmentData = {
  eventName: "Coastal Marathon 2024",
  eventType: "Outdoor Sporting Event",
  eventDate: "March 15, 2024",
  attendance: 500,
  riskScore: 6,
  riskLevel: "ELEVATED RISK",
  rationale:
    "Based on your outdoor sporting event with 500 attendees, alcohol presence, and high physical activity, your event falls into the Elevated Risk category. Events of this profile commonly require dedicated BLS coverage.",
  staffing: {
    emtCount: 2,
    certLevel: "EMT-B",
    hours: 6,
    estimatedCost: "$300–$500",
  },
  riskFactors: {
    crowd: 7,
    environmental: 5,
    activity: 8,
  },
  emtProfiles: [
    { id: 1, name: "Sarah Mitchell",  certLevel: "EMT-B", yearsExperience: 4, radiusMiles: 15, available: true  },
    { id: 2, name: "Marcus Chen",     certLevel: "EMT-B", yearsExperience: 6, radiusMiles: 20, available: true  },
    { id: 3, name: "Jordan Williams", certLevel: "EMT-P", yearsExperience: 8, radiusMiles: 25, available: false },
  ],
}

export default function ResultsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Report */}
          <div className="lg:col-span-2 space-y-10">
            {/* Header */}
            <header>
              <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase mb-3">
                Your Event Risk Assessment
              </p>
              <h1 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl lg:text-6xl font-medium text-foreground text-balance">
                {assessmentData.eventName}
              </h1>
            </header>

            {/* Risk Score */}
            <RiskScore
              score={assessmentData.riskScore}
              level={assessmentData.riskLevel}
            />

            {/* Rationale */}
            <section className="border border-border bg-card p-6">
              <h2 className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase mb-4">
                Operational Rationale
              </h2>
              <p className="text-foreground/90 leading-relaxed text-lg">
                {assessmentData.rationale}
              </p>
            </section>

            {/* Staffing Recommendation */}
            <StaffingCard
              emtCount={assessmentData.staffing.emtCount}
              certLevel={assessmentData.staffing.certLevel}
              hours={assessmentData.staffing.hours}
              estimatedCost={assessmentData.staffing.estimatedCost}
            />

            {/* EMT Profiles */}
            <section>
              <h2 className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase mb-6">
                Available Personnel
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {assessmentData.emtProfiles.map((emt) => (
                  <EMTProfileCard
                    key={emt.id}
                    name={emt.name}
                    certLevel={emt.certLevel}
                    yearsExperience={emt.yearsExperience}
                    radiusMiles={emt.radiusMiles}
                    available={emt.available}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Right Column - Sticky Summary */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-8">
              <EventSummaryPanel
                eventName={assessmentData.eventName}
                eventType={assessmentData.eventType}
                eventDate={assessmentData.eventDate}
                attendance={assessmentData.attendance}
                riskFactors={assessmentData.riskFactors}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
