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
    question: "How does the AI risk scoring work?",
    answer:
      "Our AI evaluates over 30 risk factors — including expected attendance, venue type, event duration, proximity to trauma centers, historical patient presentation rates for similar events, and more. It outputs a 0–100 risk score with a full breakdown of contributing factors, so you can justify every staffing decision.",
  },
  {
    question: "How do I find and book an EMT?",
    answer:
      "Browse certified EMTs on the Personnel page, filtered by certification level, experience, location, and event-type specialization. Each profile shows the EMT's posted hourly rate, event history, and availability. Send a booking request directly — no intermediary, no agency markup.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Standby is free to use. Running an assessment, getting a staffing recommendation, and browsing matched EMTs costs nothing. You pay your EMT directly at their posted hourly rate, which typically ranges from $35–45/hr for First Responders, $50–70/hr for EMT-Basics, and $85–135/hr for Paramedics — a fraction of traditional agency standby packages.",
  },
  {
    question: "What's included in the compliance report?",
    answer:
      "The compliance report includes your event risk classification, staffing ratio justification, equipment requirements, medical command structure, emergency access plan, and the AI model's reasoning — all formatted for Authority Having Jurisdiction (AHJ) review and insurance documentation.",
  },
  {
    question: "How accurate are the staffing recommendations?",
    answer:
      "Our recommendations are based on NAEMSP and event medicine best-practice guidelines, calibrated against data from 2,500+ real events. Coordinators using Standby report a 98% first-submission AHJ approval rate. That said, Standby recommendations should always be reviewed by a qualified medical director.",
  },
  {
    question: "Is my event data secure?",
    answer:
      "Yes. All data is encrypted in transit and at rest. We do not share event-specific information with third parties. Enterprise plans include on-premises deployment options and dedicated data residency configurations for organizations with strict compliance requirements.",
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
