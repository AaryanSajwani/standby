import Link from "next/link"
import { ShieldCheck, DollarSign, CalendarCheck, Star, FileCheck, BadgeCheck } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "For EMTs — Standby",
  description:
    "Bring your certification, set your own rate, and keep 100% of what you earn. Join Standby's founding cohort of event EMTs.",
}

const VALUE_PROPS = [
  {
    Icon: DollarSign,
    title: "Keep 100% of your rate",
    body: "You're paid your full posted rate. Standby's service fee is charged to the organizer on top — never cut from what you earn.",
  },
  {
    Icon: BadgeCheck,
    title: "You set the terms",
    body: "Set your own rate, service radius, event specialties, and availability. Take the work that fits.",
  },
  {
    Icon: ShieldCheck,
    title: "A verified badge that means something",
    body: "We check your credentials before your profile goes live, so organizers trust the listing — and you stand apart from a Facebook-group post.",
  },
  {
    Icon: Star,
    title: "First pick as a founding medic",
    body: "Join early and you're at the front of the line for requests as organizers come online in your area.",
  },
]

const STEPS = [
  { n: "01", title: "Create your profile", body: "Certification level, service area, rate, and the event types you cover." },
  { n: "02", title: "Get verified", body: "We review your licensure and credentials before your profile is published." },
  { n: "03", title: "Set your availability", body: "Mark yourself available and tune your radius. Update it whenever your schedule changes." },
  { n: "04", title: "Accept and get paid", body: "Receive coverage requests, accept the ones you want, and get paid directly by the organizer." },
]

export default function ForEmtsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1100px] mx-auto px-6 py-16 md:py-24 flex flex-col gap-20">

        {/* Hero */}
        <section className="flex flex-col items-start gap-6 max-w-[680px]">
          <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/5 rounded-full px-3 py-1">
            <span className="text-xs font-mono text-primary tracking-widest uppercase">For EMTs</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold leading-tight tracking-tight">
            Bring your certification. Keep your rate.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Standby connects licensed EMTs with event organizers who need defensible medical
            coverage. You set your rate, you choose your shifts, and you keep every dollar
            organizers pay — no agency taking a cut of your work.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/auth?role=emt&next=/onboarding/emt"
              className={cn(buttonVariants(), "rounded-full px-6 font-medium")}
            >
              Create your EMT profile
            </Link>
            <Link
              href="/auth?role=emt&next=/emt-dashboard"
              className={cn(buttonVariants({ variant: "outline" }), "rounded-full px-6 font-medium")}
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Value props */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border/60 border border-border/60 rounded-2xl overflow-hidden">
          {VALUE_PROPS.map(({ Icon, title, body }) => (
            <div key={title} className="bg-card p-6 md:p-8 flex flex-col gap-3">
              <Icon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Getting started</span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">From sign-up to first shift</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="flex flex-col gap-3 p-6 rounded-2xl border border-border/60 bg-card">
                <span className="font-mono text-4xl font-bold tabular-nums text-primary/30 leading-none">{n}</span>
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Payment & credentials — honest, no fabricated insurance product */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3 p-6 md:p-8 border border-border bg-card">
            <DollarSign className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">How payment works</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              When an organizer requests you and you accept, you&apos;re paid at your posted rate.
              Standby&apos;s service fee is charged to the organizer on top of your rate — it never
              comes out of what you earn. You keep 100% of what you post.
            </p>
          </div>
          <div className="flex flex-col gap-3 p-6 md:p-8 border border-border bg-card">
            <FileCheck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Credentials &amp; coverage</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You maintain your own certification, licensure, and any insurance you carry. We
              verify your credentials before your profile goes live so organizers can trust who
              they&apos;re booking. Your license details are stored privately and never shown publicly.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="flex flex-col items-center gap-6 text-center border border-border bg-card rounded-2xl px-6 py-12 md:py-16">
          <CalendarCheck className="w-8 h-8 text-primary" />
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight max-w-[520px]">
            Join the founding cohort of Standby medics
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-[480px] leading-relaxed">
            We&apos;re onboarding our first EMTs now. Get verified, set your rate, and be first in
            line as organizers come online in your area.
          </p>
          <Link
            href="/auth?role=emt&next=/onboarding/emt"
            className={cn(buttonVariants({ size: "lg" }), "rounded-full px-7 font-medium")}
          >
            Create your EMT profile
          </Link>
        </section>

      </div>
    </main>
  )
}
