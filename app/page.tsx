import { LandingHero } from "@/components/landing/landing-hero"
import { LandingSocialProof } from "@/components/landing/landing-social-proof"
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works"
import { LandingBento } from "@/components/landing/landing-bento"
import { LandingMethodology } from "@/components/landing/landing-methodology"
import { LandingPricing } from "@/components/landing/landing-pricing"
import { LandingFAQ } from "@/components/landing/landing-faq"
import { LandingCTA } from "@/components/landing/landing-cta"
import { LandingFooter } from "@/components/landing/landing-footer"
import { AnimatedSection } from "@/components/landing/animated-section"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const emtHref = user ? "/emt-dashboard" : "/auth?role=emt&next=/emt-dashboard"

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-0">
      <div className="relative z-10">
        <main className="max-w-[1320px] mx-auto relative">
          <LandingHero emtHref={emtHref} />
        </main>

        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto px-6 mt-6" delay={0.1}>
          <LandingSocialProof />
        </AnimatedSection>

        <AnimatedSection id="how-it-works" className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16" delay={0.2}>
          <LandingHowItWorks />
        </AnimatedSection>

        <AnimatedSection id="features-section" className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16" delay={0.2}>
          <LandingBento />
        </AnimatedSection>

        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16" delay={0.2}>
          <LandingMethodology />
        </AnimatedSection>

        <AnimatedSection id="pricing-section" className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16" delay={0.2}>
          <LandingPricing />
        </AnimatedSection>

        <AnimatedSection id="faq-section" className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16" delay={0.2}>
          <LandingFAQ />
        </AnimatedSection>

        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16" delay={0.2}>
          <LandingCTA />
        </AnimatedSection>

        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto mt-8" delay={0.2}>
          <LandingFooter />
        </AnimatedSection>
      </div>
    </div>
  )
}
