import Link from "next/link"
import { ArrowRight, Shield, Users, BarChart3 } from "lucide-react"

const STATS = [
  { value: "2.3%", label: "Avg Patient Presentation Rate" },
  { value: "< 4 min", label: "Assessment Turnaround" },
  { value: "340+", label: "Certified EMTs on Platform" },
]

const FEATURES = [
  {
    icon: BarChart3,
    title: "Risk Assessment",
    description:
      "AI-assisted multi-factor risk scoring for events of any size. Generate a defensible staffing recommendation in minutes.",
  },
  {
    icon: Users,
    title: "EMT Marketplace",
    description:
      "Browse, filter, and request certified personnel. Profiles include cert level, experience, and event-type specializations.",
  },
  {
    icon: Shield,
    title: "Compliance Reports",
    description:
      "Export assessment reports with operational rationale — built for AHJ review, insurance documentation, and post-event audit.",
  },
]

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* ── Hero ── */}
      <section className="border-b border-border px-8 py-20 flex flex-col gap-8 max-w-4xl">
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-accent" />
          <span className="text-xs font-mono text-accent uppercase tracking-widest">
            Event Medical Risk Platform
          </span>
        </div>

        <h1 className="text-5xl font-semibold tracking-tight leading-tight">
          Medical coverage
          <br />
          <span className="text-muted-foreground">that starts before</span>
          <br />
          the event does.
        </h1>

        <p className="text-muted-foreground max-w-lg leading-relaxed">
          Standby turns event details into a defensible medical risk score,
          staffing configuration, and matched EMT roster — in one workflow.
        </p>

        <div className="flex items-center gap-4 pt-2">
          <Link
            href="/assess"
            className="h-11 px-6 bg-accent text-white text-sm font-mono uppercase tracking-wider hover:bg-accent/90 transition-colors flex items-center gap-2"
          >
            Start Assessment
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/marketplace"
            className="h-11 px-6 border border-border text-sm font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-foreground transition-colors flex items-center gap-2"
          >
            Browse Personnel
          </Link>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-b border-border bg-surface">
        <div className="grid grid-cols-3 divide-x divide-border">
          {STATS.map(({ value, label }) => (
            <div key={label} className="px-8 py-6 flex flex-col gap-1">
              <span className="font-mono text-3xl font-bold text-foreground">
                {value}
              </span>
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-8 py-16">
        <div className="mb-10">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Platform Capabilities
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-background p-8 flex flex-col gap-4 hover:bg-surface transition-colors"
            >
              <div className="w-8 h-8 border border-border flex items-center justify-center">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="mt-auto border-t border-border bg-surface px-8 py-10 flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            Ready to assess your event?
          </p>
          <p className="text-lg font-medium">
            Generate a risk report in under 5 minutes.
          </p>
        </div>
        <Link
          href="/assess"
          className="h-10 px-6 bg-accent text-white text-xs font-mono uppercase tracking-wider hover:bg-accent/90 transition-colors flex items-center gap-2 shrink-0"
        >
          New Assessment
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </div>
  )
}
