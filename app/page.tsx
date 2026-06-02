import Link from "next/link"
import { ArrowRight, Shield, Users, BarChart3, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

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
    href: "/assess",
  },
  {
    icon: Users,
    title: "EMT Marketplace",
    description:
      "Browse, filter, and request certified personnel. Profiles include cert level, experience, and event-type specializations.",
    href: "/marketplace",
  },
  {
    icon: Shield,
    title: "Compliance Reports",
    description:
      "Export assessment reports with operational rationale — built for AHJ review, insurance documentation, and post-event audit.",
    href: "/results",
  },
]

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* ── Hero ── */}
      <section className="relative border-b border-border px-8 py-24 overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#2D3F5F22_1px,transparent_1px),linear-gradient(to_bottom,#2D3F5F22_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
        {/* Radial gradient fade */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,#E8404A18,transparent)] pointer-events-none" />

        <div className="relative max-w-3xl flex flex-col gap-6">
          <div>
            <Badge variant="outline" className="font-mono text-xs tracking-widest text-primary border-primary/30 bg-primary/5">
              Event Medical Risk Platform
            </Badge>
          </div>

          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1]">
            Medical coverage
            <br />
            <span className="text-muted-foreground">that starts before</span>
            <br />
            the event does.
          </h1>

          <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
            Standby turns event details into a defensible medical risk score,
            staffing configuration, and matched EMT roster — in one workflow.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/assess">
                Start Assessment
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/marketplace">
                Browse Personnel
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-b border-border bg-surface/50">
        <div className="grid grid-cols-3 divide-x divide-border">
          {STATS.map(({ value, label }) => (
            <div key={label} className="px-8 py-7 flex flex-col gap-1">
              <span className="font-mono text-3xl font-bold text-foreground">{value}</span>
              <span className="text-xs text-muted-foreground tracking-wide">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-8 py-16">
        <div className="flex items-center gap-3 mb-10">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Platform Capabilities
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, description, href }) => (
            <Card
              key={title}
              className="group bg-card border-border hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <CardHeader className="pb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                <Link
                  href={href}
                  className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Get started <ChevronRight className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="mt-auto border-t border-border bg-surface px-8 py-10 flex items-center justify-between gap-6">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            Ready to assess your event?
          </p>
          <p className="text-lg font-semibold">Generate a risk report in under 5 minutes.</p>
        </div>
        <Button asChild>
          <Link href="/assess">
            New Assessment
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </section>
    </div>
  )
}
