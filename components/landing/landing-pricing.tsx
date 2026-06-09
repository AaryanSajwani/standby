import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const CERT_TIERS = [
  {
    cert: "First Responder",
    range: "$35–45",
    unit: "/hr",
    description:
      "Entry-level certified coverage for low-density, low-risk events. Best for corporate gatherings, private parties, and small community functions.",
    tags: ["Private events", "Corporate", "≤ 200 attendees"],
  },
  {
    cert: "EMT-Basic",
    range: "$50–70",
    unit: "/hr",
    description:
      "BLS-certified coverage — the right fit for most events. Festivals, sporting events, concerts, and any function where a fast basic life support response is required.",
    tags: ["Festivals", "Sports", "Concerts"],
    featured: true,
  },
  {
    cert: "Paramedic",
    range: "$85–135",
    unit: "/hr",
    description:
      "ALS-certified coverage for high-acuity or high-density events. Required when advanced interventions, IV access, or cardiac monitoring may be needed on site.",
    tags: ["Large events", "High-risk", "ALS required"],
  },
]

export function LandingPricing() {
  return (
    <section className="w-full px-5 flex flex-col items-center py-8 md:py-14">
      <div className="w-full max-w-[1100px] flex flex-col gap-10">

        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Transparent pricing
          </span>
          <h2 className="text-foreground text-4xl md:text-5xl font-semibold leading-tight max-w-[600px]">
            Pay for the EMT. Not the platform.
          </h2>
          <p className="text-muted-foreground text-sm md:text-base font-medium max-w-[540px] leading-relaxed">
            Standby is free to use. Run your risk assessment, get a staffing recommendation,
            and browse matched EMTs at no cost. You pay your EMT directly at their posted rate —
            no markup, no agency overhead.
          </p>
        </div>

        {/* Rate cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border border-border">
          {CERT_TIERS.map((tier) => (
            <div
              key={tier.cert}
              className={`flex flex-col gap-5 p-6 ${tier.featured ? "bg-card" : "bg-surface"}`}
            >
              {/* Cert label */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {tier.cert}
                </span>
                {tier.featured && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/30 bg-primary/5 px-2 py-0.5">
                    Most common
                  </span>
                )}
              </div>

              {/* Rate */}
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-4xl font-bold tabular-nums text-foreground">
                  {tier.range}
                </span>
                <span className="font-mono text-sm text-muted-foreground">{tier.unit}</span>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">{tier.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {tier.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer strip */}
        <div className="border border-border bg-surface px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              What's included at no charge
            </span>
            <p className="text-sm text-foreground">
              Risk assessment · Staffing recommendation · EMT matching · Compliance documentation
            </p>
          </div>
          <Link
            href="/personnel"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 font-mono text-xs uppercase tracking-wider")}
          >
            Browse personnel rates
          </Link>
        </div>

      </div>
    </section>
  )
}
