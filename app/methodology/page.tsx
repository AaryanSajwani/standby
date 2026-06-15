import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ACTIVITY_RISK, EVENT_TYPE_LABELS } from "@/lib/assessment"

export const metadata = {
  title: "Methodology — Standby",
  description:
    "How Standby scores event medical risk: the factors, the weights, and the mass-gathering medicine guidelines behind every recommendation.",
}

// Documents the actual engine in lib/assessment.ts. Keep in sync if the scoring changes.
const CROWD_BANDS = [
  { range: "< 200", score: "2" },
  { range: "200 – 499", score: "3" },
  { range: "500 – 1,999", score: "5" },
  { range: "2,000 – 9,999", score: "7" },
  { range: "10,000 – 49,999", score: "8" },
  { range: "50,000+", score: "9" },
]

const ENVIRONMENTAL_FACTORS = [
  { factor: "Outdoor venue", delta: "+3" },
  { factor: "Partially outdoor (mixed)", delta: "+2" },
  { factor: "Expected heat or cold", delta: "+2" },
  { factor: "Rain or variable conditions", delta: "+1" },
  { factor: "High temperature ≥ 90°F", delta: "+1" },
  { factor: "High precipitation risk", delta: "+1" },
  { factor: "Nearest hospital > 10 mi", delta: "+1" },
]

const READINESS_PENALTIES = [
  { factor: "No on-site AED", delta: "+0.5" },
  { factor: "No prior medical plan", delta: "+0.5" },
  { factor: "Access routes not clear", delta: "+1" },
  { factor: "Access routes limited", delta: "+0.5" },
]

const RISK_LEVELS = [
  { level: "Low", range: "1 – 3", token: "text-risk-low border-risk-low/40 bg-risk-low/5" },
  { level: "Moderate", range: "4 – 5", token: "text-risk-medium border-risk-medium/40 bg-risk-medium/5" },
  { level: "High", range: "6 – 8", token: "text-risk-high border-risk-high/40 bg-risk-high/5" },
  { level: "Critical", range: "9 – 10", token: "text-risk-critical border-risk-critical/40 bg-risk-critical/5" },
]

const CITATIONS = [
  "NAEMSP (National Association of EMS Physicians) — mass-gathering EMS position statements on coverage levels and medical direction.",
  "Arbon et al. — predictive modeling of patient presentation rates (PPR) and transport-to-hospital rates (TTHR) at mass gatherings.",
  "Hartman et al. — environmental and crowd factors in mass-gathering medical usage rates.",
  "Event-medicine literature on advanced (ALS) vs. basic (BLS) life-support thresholds by event acuity and density.",
]

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-border last:border-b-0">
      <span className="text-sm text-foreground/90">{label}</span>
      <span className="font-mono text-sm tabular-nums font-semibold text-foreground shrink-0">{value}</span>
    </div>
  )
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs tabular-nums text-primary">{n}</span>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export default function MethodologyPage() {
  // Activity-risk table straight from the engine, sorted high → low
  const activityRows = Object.entries(ACTIVITY_RISK)
    .map(([key, score]) => ({ label: EVENT_TYPE_LABELS[key] ?? key, score }))
    .sort((a, b) => b.score - a.score)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16 lg:py-20">
        <header className="flex flex-col gap-3 pb-10 border-b border-border">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Methodology</span>
          <h1 className="text-4xl font-semibold tracking-tight">How Standby scores event medical risk</h1>
          <p className="text-muted-foreground leading-relaxed max-w-[640px]">
            Standby uses a transparent, multi-factor model — not a black box and not &ldquo;AI magic.&rdquo;
            This page documents the exact factors and weights behind every score, and the guidelines
            they&apos;re grounded in. Recommendations are decision support and must be reviewed and
            approved by a qualified medical director.
          </p>
        </header>

        <div className="flex flex-col gap-12 py-10">
          <Section n="01" title="The composite score">
            <p className="text-foreground/80 leading-relaxed">
              Every event gets a 0–10 risk level from three weighted dimensions, plus a readiness
              penalty for missing on-site resources:
            </p>
            <div className="border border-border bg-card p-5 font-mono text-sm text-foreground tabular-nums leading-relaxed">
              risk = (crowd × <span className="text-primary">0.40</span>) + (environmental × <span className="text-primary">0.30</span>) + (activity × <span className="text-primary">0.30</span>) + readiness penalty
            </div>
          </Section>

          <Section n="02" title="Crowd risk — by expected attendance">
            <p className="text-foreground/80 leading-relaxed">
              Scaled by headcount, then <span className="font-mono text-sm">+1</span> for crowd-energy
              events (festivals, political rallies) and <span className="font-mono text-sm">+1</span> when
              there is no security presence.
            </p>
            <div className="border border-border bg-card">
              {CROWD_BANDS.map((b) => (
                <StatRow key={b.range} label={`${b.range} attendees`} value={b.score} />
              ))}
            </div>
          </Section>

          <Section n="03" title="Environmental risk — exposure & access to care">
            <p className="text-foreground/80 leading-relaxed">Starts at a baseline of 2, then adds:</p>
            <div className="border border-border bg-card">
              {ENVIRONMENTAL_FACTORS.map((f) => (
                <StatRow key={f.factor} label={f.factor} value={f.delta} />
              ))}
            </div>
          </Section>

          <Section n="04" title="Activity risk — by event type">
            <p className="text-foreground/80 leading-relaxed">
              The physical intensity and typical patient-presentation profile of the event itself:
            </p>
            <div className="border border-border bg-card">
              {activityRows.map((r) => (
                <StatRow key={r.label} label={r.label} value={`${r.score} / 10`} />
              ))}
            </div>
          </Section>

          <Section n="05" title="Readiness penalty — missing resources raise the score">
            <div className="border border-border bg-card">
              {READINESS_PENALTIES.map((p) => (
                <StatRow key={p.factor} label={p.factor} value={p.delta} />
              ))}
            </div>
          </Section>

          <Section n="06" title="Risk levels">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {RISK_LEVELS.map((l) => (
                <div key={l.level} className={`border p-4 flex flex-col gap-1 ${l.token}`}>
                  <span className="font-mono text-2xl font-bold tabular-nums">{l.range}</span>
                  <span className="text-sm font-medium">{l.level}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section n="07" title="Staffing recommendation">
            <ul className="flex flex-col gap-2 text-foreground/80 leading-relaxed list-disc pl-5">
              <li><span className="font-medium text-foreground">Certification:</span> Paramedic (ALS) for High/Critical events; EMT-Basic for Moderate; First Responder for small low-risk events (under 300 attendees), otherwise EMT-Basic.</li>
              <li><span className="font-medium text-foreground">Headcount:</span> roughly one EMT per <span className="font-mono text-sm tabular-nums">750</span> attendees, with a floor of <span className="font-mono text-sm tabular-nums">2</span> for High and <span className="font-mono text-sm tabular-nums">3</span> for Critical, capped at <span className="font-mono text-sm tabular-nums">12</span>.</li>
              <li><span className="font-medium text-foreground">Coverage hours:</span> set by event type (e.g. festivals run longer than corporate events).</li>
            </ul>
          </Section>

          <Section n="08" title="Guideline basis">
            <p className="text-foreground/80 leading-relaxed">
              The factor structure and thresholds are grounded in published mass-gathering and
              event-medicine guidance:
            </p>
            <ul className="flex flex-col gap-3">
              {CITATIONS.map((c, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground/80 leading-relaxed">
                  <span className="font-mono text-xs text-primary tabular-nums shrink-0 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="border-t border-border pt-8 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Standby is a decision-support tool, not a medical provider. Every recommendation should be
            reviewed and signed off by a qualified medical director before an event.
          </p>
          <Link href="/assess" className={cn(buttonVariants(), "w-fit rounded-full px-6 font-medium")}>
            Run an assessment
          </Link>
        </div>
      </div>
    </main>
  )
}
