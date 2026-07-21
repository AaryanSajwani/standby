"use client"

import type React from "react"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

const FAQ_DATA = [
  {
    question: "What is Standby and who is it for?",
    answer:
      "Standby is an event medical risk assessment and EMT staffing platform built for event coordinators, safety officers, and medical directors. Whether you're running a 500-person corporate event or a 50,000-person music festival, Standby generates a defensible risk assessment and matched staffing configuration in minutes.",
  },
  {
    question: "How does the risk scoring work?",
    answer:
      "A multi-factor model — not a black box — scores your event across crowd, environmental, and activity exposure. It weighs expected attendance, venue type and outdoor exposure, weather, proximity to definitive care, on-site resources, and emergency access, then outputs a 0–10 risk level with a full breakdown of the contributing factors, so you can justify every staffing decision.",
  },
  {
    question: "How do I find and book an EMT?",
    answer:
      "Browse certified EMTs on the Personnel page, filtered by certification level, experience, location, and event-type specialization. Each profile shows the EMT's posted hourly rate, event history, and availability. Send a booking request directly: the EMT keeps 100% of their posted rate, and Standby's service fee is added on top and shown as its own line — never buried in the rate.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Assessing your event, getting a staffing recommendation, and browsing matched EMTs is free. When you book, the EMT keeps 100% of their posted hourly rate — typically $15–18/hr for EMRs (first responders) and $18–22/hr for EMT-Basics — and Standby adds a transparent service fee on top, shown as its own line at checkout. AHJ-ready compliance reporting will be part of Standby Premier; it's free to preview during early access.",
  },
  {
    question: "What's included in the compliance report?",
    answer:
      "The compliance report includes your event risk classification, staffing ratio justification, equipment requirements, medical command structure, emergency access plan, and the model's reasoning with the guidelines it references — all formatted for Authority Having Jurisdiction (AHJ) review and insurance documentation.",
  },
  {
    question: "How accurate are the staffing recommendations?",
    answer:
      "Recommendations are grounded in mass-gathering and event-medicine best-practice guidelines, including NAEMSP position statements. Each staffing line references the basis for its ratio, so an AHJ can see the reasoning rather than take a number on faith. Standby is a decision-support tool — every recommendation should be reviewed and signed off by a qualified medical director.",
  },
  {
    question: "Is my event data secure?",
    answer:
      "Yes. All data is encrypted in transit and at rest, and we don't sell or share your event-specific information with third parties. You can request export or deletion of your data at any time. See our Privacy Policy for the full detail of what we collect and why.",
  },
]

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="w-full bg-card/30 overflow-hidden rounded-xl border border-border/40 transition-all duration-500 ease-out cursor-pointer"
      onClick={(e: React.MouseEvent) => { e.preventDefault(); onToggle() }}
    >
      <div className="w-full px-5 py-[18px] pr-4 flex justify-between items-center gap-5 text-left">
        <div className="flex-1 text-foreground text-base font-medium leading-6 break-words">{question}</div>
        <div className="flex justify-center items-center">
          <ChevronDown
            className={`w-6 h-6 text-muted-foreground transition-all duration-500 ease-out ${isOpen ? "rotate-180 scale-110" : "rotate-0 scale-100"}`}
          />
        </div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-500 ease-out ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
        style={{ transitionProperty: "max-height, opacity, padding", transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <div className={`px-5 transition-all duration-500 ease-out ${isOpen ? "pb-[18px] pt-2 translate-y-0" : "pb-0 pt-0 -translate-y-2"}`}>
          <div className="text-muted-foreground text-sm font-normal leading-6 break-words">{answer}</div>
        </div>
      </div>
    </div>
  )
}

export function LandingFAQ() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  const toggle = (i: number) => {
    const next = new Set(openItems)
    next.has(i) ? next.delete(i) : next.add(i)
    setOpenItems(next)
  }

  return (
    <section className="w-full pt-[66px] pb-20 md:pb-40 px-5 relative flex flex-col justify-center items-center">
      <div className="w-[300px] h-[500px] absolute top-[150px] left-1/2 -translate-x-1/2 bg-primary/8 blur-[100px] z-0 pointer-events-none" />
      <div className="self-stretch pt-8 pb-8 md:pt-14 md:pb-14 flex flex-col justify-center items-center gap-2 relative z-10">
        <div className="flex flex-col justify-start items-center gap-4">
          <h2 className="w-full max-w-[435px] text-center text-foreground text-4xl font-semibold leading-10 break-words">
            Frequently Asked Questions
          </h2>
          <p className="self-stretch text-center text-muted-foreground text-sm font-medium leading-[18.20px] break-words">
            Everything you need to know about Standby and how it protects your events
          </p>
        </div>
      </div>
      <div className="w-full max-w-[600px] pt-0.5 pb-10 flex flex-col gap-4 relative z-10">
        {FAQ_DATA.map((faq, i) => (
          <FAQItem key={i} {...faq} isOpen={openItems.has(i)} onToggle={() => toggle(i)} />
        ))}
      </div>
    </section>
  )
}
