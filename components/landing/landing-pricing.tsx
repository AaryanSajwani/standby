"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PLANS = [
  {
    name: "Starter",
    monthlyPrice: "$0",
    annualPrice: "$0",
    description: "For individual event coordinators getting started.",
    features: [
      "Up to 3 assessments per month",
      "AI risk scoring",
      "Basic staffing recommendations",
      "PDF compliance report",
      "EMT marketplace access (read-only)",
    ],
    buttonText: "Get Started Free",
    buttonHref: "/assess",
    buttonClass:
      "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm",
  },
  {
    name: "Professional",
    monthlyPrice: "$49",
    annualPrice: "$39",
    description: "For active event coordinators who run multiple events.",
    features: [
      "Unlimited assessments",
      "Advanced multi-factor risk scoring",
      "Full staffing configuration suite",
      "AHJ-ready compliance reports",
      "EMT marketplace request & booking",
      "Priority email support",
    ],
    buttonText: "Start Free Trial",
    buttonHref: "/assess",
    buttonClass:
      "bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-sm",
    popular: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    description: "For organizations managing large or recurring events.",
    features: [
      "Everything in Professional",
      "Multi-event dashboard",
      "Dedicated account manager",
      "Custom risk model tuning",
      "SLA guarantees",
      "On-premises deployment options",
    ],
    buttonText: "Talk to Sales",
    buttonHref: "/assess",
    buttonClass:
      "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm",
  },
]

export function LandingPricing() {
  const [isAnnual, setIsAnnual] = useState(true)

  return (
    <section className="w-full px-5 overflow-hidden flex flex-col justify-start items-center my-0 py-8 md:py-14">
      <div className="self-stretch relative flex flex-col justify-center items-center gap-2 py-0">
        <div className="flex flex-col justify-start items-center gap-4">
          <h2 className="text-center text-foreground text-4xl md:text-5xl font-semibold leading-tight">
            Pricing built for every event
          </h2>
          <p className="self-stretch text-center text-muted-foreground text-sm font-medium leading-tight">
            From one-off community events to large-scale productions — <br className="hidden md:block" />
            Standby scales with your operation.
          </p>
        </div>
        <div className="pt-4">
          <div className="p-0.5 bg-muted rounded-lg border border-border/40 flex justify-start items-center gap-1">
            <button
              onClick={() => setIsAnnual(true)}
              className={`pl-2 pr-1 py-1 flex justify-start items-start gap-2 rounded-md transition-colors ${isAnnual ? "bg-card shadow-sm" : ""}`}
            >
              <span className={`text-center text-sm font-medium leading-tight ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
                Annually
              </span>
              {isAnnual && (
                <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Save 20%</span>
              )}
            </button>
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-2 py-1 flex justify-start items-start rounded-md transition-colors ${!isAnnual ? "bg-card shadow-sm" : ""}`}
            >
              <span className={`text-center text-sm font-medium leading-tight ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
                Monthly
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="self-stretch px-5 flex flex-col md:flex-row justify-start items-stretch gap-4 md:gap-6 mt-6 max-w-[1100px] mx-auto">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`flex-1 p-4 overflow-hidden rounded-xl flex flex-col justify-start items-start gap-6 ${
              plan.popular
                ? "bg-primary shadow-[0px_4px_24px_-2px_rgba(232,64,74,0.25)]"
                : "bg-gradient-to-b from-white/5 to-white/0 border border-border/40"
            }`}
          >
            <div className="self-stretch flex flex-col justify-start items-start gap-6">
              <div className="self-stretch flex flex-col justify-start items-start gap-8">
                <div className={`w-full text-sm font-medium leading-tight flex items-center gap-2 ${plan.popular ? "text-white" : "text-foreground"}`}>
                  {plan.name}
                  {plan.popular && (
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white">
                      Popular
                    </span>
                  )}
                </div>
                <div className="self-stretch flex flex-col justify-start items-start gap-1">
                  <div className="flex justify-start items-center gap-1.5">
                    <div className={`relative h-10 flex items-center text-3xl font-medium leading-10 ${plan.popular ? "text-white" : "text-foreground"}`}>
                      <span className="invisible">{isAnnual ? plan.annualPrice : plan.monthlyPrice}</span>
                      <span
                        className="absolute inset-0 flex items-center transition-all duration-500"
                        style={{ opacity: isAnnual ? 1 : 0, transform: `scale(${isAnnual ? 1 : 0.8})`, filter: `blur(${isAnnual ? 0 : 4}px)` }}
                        aria-hidden={!isAnnual}
                      >
                        {plan.annualPrice}
                      </span>
                      <span
                        className="absolute inset-0 flex items-center transition-all duration-500"
                        style={{ opacity: !isAnnual ? 1 : 0, transform: `scale(${!isAnnual ? 1 : 0.8})`, filter: `blur(${!isAnnual ? 0 : 4}px)` }}
                        aria-hidden={isAnnual}
                      >
                        {plan.monthlyPrice}
                      </span>
                    </div>
                    {plan.monthlyPrice !== "Custom" && (
                      <div className={`text-center text-sm font-medium leading-tight ${plan.popular ? "text-white/70" : "text-muted-foreground"}`}>
                        /month
                      </div>
                    )}
                  </div>
                  <div className={`self-stretch text-sm font-medium leading-tight ${plan.popular ? "text-white/70" : "text-muted-foreground"}`}>
                    {plan.description}
                  </div>
                </div>
              </div>
              <Link href={plan.buttonHref} className={cn(buttonVariants(), `self-stretch px-5 py-2 rounded-full flex justify-center items-center ${plan.buttonClass}`)}>
                {plan.buttonText}
              </Link>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-4">
              <div className={`self-stretch text-sm font-medium leading-tight ${plan.popular ? "text-white/70" : "text-muted-foreground"}`}>
                {plan.name === "Starter" ? "Included:" : "Everything in previous +"}
              </div>
              <div className="self-stretch flex flex-col justify-start items-start gap-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="self-stretch flex justify-start items-center gap-2">
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <Check
                        className={`w-full h-full ${plan.popular ? "text-white" : "text-muted-foreground"}`}
                        strokeWidth={2}
                      />
                    </div>
                    <div className={`leading-tight font-normal text-sm text-left ${plan.popular ? "text-white" : "text-muted-foreground"}`}>
                      {feature}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
