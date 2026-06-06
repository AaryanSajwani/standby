import type { ComponentType } from "react"
import RiskScoringIllustration from "./bento/risk-scoring"
import EMTMarketplaceIllustration from "./bento/emt-marketplace"
import ComplianceReportsIllustration from "./bento/compliance-reports"
import StaffingConfigIllustration from "./bento/staffing-config"
import EventIntelligenceIllustration from "./bento/event-intelligence"
import InstantMatchingIllustration from "./bento/instant-matching"

const BentoCard = ({
  title,
  description,
  Component,
}: {
  title: string
  description: string
  Component: ComponentType
}) => (
  <div className="overflow-hidden rounded-2xl border border-border/60 bg-card flex flex-col justify-start items-start relative hover:border-primary/30 transition-colors duration-300 group">
    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="self-stretch p-6 flex flex-col justify-start items-start gap-2">
      <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
        <p className="self-stretch text-foreground text-lg font-normal leading-7">
          {title} <br />
          <span className="text-muted-foreground">{description}</span>
        </p>
      </div>
    </div>
    <div className="self-stretch h-72 relative -mt-0.5">
      <Component />
    </div>
  </div>
)

const CARDS = [
  {
    title: "AI-powered risk scoring.",
    description: "Get defensible multi-factor assessments in minutes, not hours.",
    Component: RiskScoringIllustration,
  },
  {
    title: "EMT Marketplace.",
    description: "Browse 340+ certified professionals matched to your event.",
    Component: EMTMarketplaceIllustration,
  },
  {
    title: "Compliance reports.",
    description: "Export AHJ-ready documentation for insurance and post-event audit.",
    Component: ComplianceReportsIllustration,
  },
  {
    title: "Staffing configuration.",
    description: "Precise staffing ratios based on attendance, venue, and event type.",
    Component: StaffingConfigIllustration,
  },
  {
    title: "Event intelligence.",
    description: "AI trained on 2,500+ real events across every category.",
    Component: EventIntelligenceIllustration,
  },
  {
    title: "Instant EMT matching.",
    description: "Connect with local EMTs who specialize in your event category.",
    Component: InstantMatchingIllustration,
  },
]

export function LandingBento() {
  return (
    <section className="w-full px-5 flex flex-col justify-center items-center overflow-visible bg-transparent">
      <div className="w-full py-8 md:py-16 relative flex flex-col justify-start items-start gap-6">
        <div className="w-[547px] h-[938px] absolute top-[614px] left-[80px] origin-top-left rotate-[-33.39deg] bg-primary/10 blur-[130px] z-0 pointer-events-none" />
        <div className="self-stretch py-8 md:py-14 flex flex-col justify-center items-center gap-2 z-10">
          <div className="flex flex-col justify-start items-center gap-4">
            <h2 className="w-full max-w-[700px] text-center text-foreground text-4xl md:text-6xl font-semibold leading-tight md:leading-[66px]">
              Everything your event medical coverage needs
            </h2>
            <p className="w-full max-w-[600px] text-center text-muted-foreground text-lg md:text-xl font-medium leading-relaxed">
              From AI risk scoring to AHJ-ready documentation, Standby covers the entire event medical workflow in a single platform.
            </p>
          </div>
        </div>
        <div className="self-stretch grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
          {CARDS.map((card) => (
            <BentoCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </section>
  )
}
