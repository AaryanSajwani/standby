// Two BLS tiers — the supply Standby staffs (2026-07-21 repricing; paramedic
// tier removed until ALS supply exists). Keep in sync with CERT_RATE_RANGE in
// lib/assessment.ts and the onboarding rate hint.
const CERT_TIERS = [
  {
    cert: "EMR (First Responder)",
    range: "$20–28",
    unit: "/hr",
    description:
      "Emergency Medical Responder — entry-level certified coverage for low-density, low-risk events. Best for corporate gatherings, private parties, and small community functions.",
    tags: ["Private events", "Corporate", "≤ 200 attendees"],
  },
  {
    cert: "EMT-Basic (EMT-B)",
    range: "$20–40",
    unit: "/hr",
    description:
      "BLS-certified coverage — the right fit for most events. Festivals, sporting events, concerts, and any function where a fast basic life support response is required.",
    tags: ["Festivals", "Sports", "Concerts"],
    featured: true,
  },
]

// Transparent commission, buyer-side: the EMT keeps 100% of their posted rate;
// Standby's fee is added on top and shown as its own line. No fabricated dollar
// amounts here — the real split renders at checkout once booking is wired (§6).
const FEE_SPLIT = [
  { label: "What the medic earns", value: "100% of their posted rate" },
  { label: "Standby service fee", value: "Added on top, shown as its own line" },
  { label: "What you pay", value: "Both, itemized at checkout" },
]

const PREMIER_FEATURES = [
  "Event risk classification and staffing justification, formatted for permit review",
  "Every staffing ratio cites its guideline basis",
  "Versioned and exportable for insurance and post-event audit",
]

export function LandingPricing() {
  return (
    <section className="w-full px-5 flex flex-col items-center py-8 md:py-14">
      <div className="w-full max-w-[1100px] flex flex-col gap-12">

        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Transparent pricing
          </span>
          <h2 className="text-foreground text-4xl md:text-5xl font-semibold leading-tight max-w-[680px]">
            Coverage you can price — and prove.
          </h2>
          <p className="text-muted-foreground text-sm md:text-base font-medium max-w-[580px] leading-relaxed">
            Two parts, both transparent. Book medics at their posted rate with the platform fee
            shown in the open — and soon, turn the same risk assessment into an AHJ-ready
            compliance report you can hand your permitting authority.
          </p>
        </div>

        {/* Part 1 — Booking: transparent commission */}
        <div className="flex flex-col gap-5">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">01 · Booking</span>
            <div className="flex-1 h-px bg-border" />
            <span className="font-mono text-xs uppercase tracking-widest text-primary">Transparent commission</span>
          </div>

          {/* The split — labels only, no fabricated amounts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            {FEE_SPLIT.map(({ label, value }) => (
              <div key={label} className="bg-surface px-6 py-5 flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
                <span className="text-sm text-foreground leading-snug">{value}</span>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-[680px]">
            No markup hidden in the rate. The medic keeps every dollar they post; Standby&apos;s fee is
            separate and labeled, so you always see exactly what goes to coverage versus the platform.
          </p>
        </div>

        {/* Rate cards — EMT posted rates (market-rate reference) */}
        <div className="flex flex-col gap-4">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            EMT posted rates — what the medic keeps
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border border border-border">
            {CERT_TIERS.map((tier) => (
              <div
                key={tier.cert}
                className={`flex flex-col gap-5 p-6 ${tier.featured ? "bg-card" : "bg-surface"}`}
              >
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

                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-4xl font-bold tabular-nums text-foreground">
                    {tier.range}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">{tier.unit}</span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">{tier.description}</p>

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
        </div>

        {/* Part 2 — Standby Premier: compliance subscription (coming soon, not wired) */}
        <div className="flex flex-col gap-5">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">02 · Standby Premier</span>
            <div className="flex-1 h-px bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground border border-border px-2 py-0.5">
              Coming soon
            </span>
          </div>

          <div className="border border-primary/40 bg-primary/5 p-6 md:p-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h3 className="text-foreground text-2xl font-semibold">Prove your coverage to the AHJ</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[680px]">
                Turn your risk assessment into an AHJ-ready coverage report — the documentation you
                hand your Authority Having Jurisdiction (the fire marshal, local EMS office, or
                special-events office) to show your event is adequately staffed. Built on the same
                multi-factor risk engine, not a separate questionnaire.
              </p>
            </div>

            <ul className="flex flex-col gap-2.5">
              {PREMIER_FEATURES.map((feature, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground/80 leading-relaxed">
                  <span className="font-mono text-xs text-primary tabular-nums shrink-0 mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                disabled
                aria-disabled="true"
                className="inline-flex items-center justify-center h-8 px-4 border border-border bg-surface text-muted-foreground font-mono text-xs uppercase tracking-wider opacity-60 cursor-not-allowed"
              >
                Premier — coming soon
              </button>
              <span className="text-xs text-muted-foreground">
                Reporting is free to preview during early access.
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
