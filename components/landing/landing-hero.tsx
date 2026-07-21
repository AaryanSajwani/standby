import React from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LandingHeroProps {
  emtHref?: string
}

export function LandingHero({ emtHref = "/auth?role=emt&next=/emt-dashboard" }: LandingHeroProps) {
  return (
    <section
      className="flex flex-col items-center text-center relative mx-auto rounded-2xl overflow-hidden my-6 py-0 px-4
         w-full h-[400px] md:w-[1220px] md:h-[600px] lg:h-[810px] md:px-0 bg-background"
    >
      {/* Standby grid lines */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, #16294E40 1px, transparent 1px), linear-gradient(to bottom, #16294E40 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Primary red radial glow — top right, like old homepage */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse 70% 55% at 85% -5%, #F0424920, transparent)",
        }}
      />
      {/* Subtle blue vignette at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-0"
        style={{ background: "linear-gradient(to top, #041228, transparent)" }}
      />
      {/* Border frame */}
      <div className="absolute inset-0 rounded-2xl border border-border/40 pointer-events-none z-10" />

      {/* Decorative highlighted grid cells */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute" style={{ top: 81, left: 699, width: 36, height: 36, background: "#F7F8F90A" }} />
        <div className="absolute" style={{ top: 153, left: 195, width: 36, height: 36, background: "#F7F8F90C" }} />
        <div className="absolute" style={{ top: 225, left: 1095, width: 36, height: 36, background: "#F7F8F90C" }} />
        <div className="absolute" style={{ top: 405, left: 87, width: 36, height: 36, background: "#F7F8F90C" }} />
        <div className="absolute" style={{ top: 405, left: 771, width: 36, height: 36, background: "#F042490A" }} />
        <div className="absolute" style={{ top: 333, left: 231, width: 36, height: 36, background: "#F0424908" }} />
      </div>

      {/* Hero Content — text left, assessment visual right */}
      <div className="relative z-10 w-full h-full flex items-center justify-between gap-10 px-2 md:px-12 lg:px-16 text-left">
        <div className="space-y-4 md:space-y-5 lg:space-y-6 max-w-md md:max-w-[460px] lg:max-w-[560px]">
          <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/5 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-standby-pulse" />
            <span className="text-xs font-mono text-primary tracking-widest uppercase">Event Medical Risk Platform</span>
          </div>
          <h1 className="text-foreground text-3xl md:text-4xl lg:text-6xl font-semibold leading-tight">
            Medical coverage that starts before the event does.
          </h1>
          <p className="text-muted-foreground text-base md:text-base lg:text-lg font-medium leading-relaxed">
            Standby turns event details into a defensible medical risk score, staffing configuration, and matched EMT roster — in one workflow.
          </p>
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center gap-3">
              <Link href="/assess" className={cn(buttonVariants(), "rounded-full px-6 font-medium")}>
                Start assessment
              </Link>
              <Link href="/personnel" className={cn(buttonVariants({ variant: "outline" }), "rounded-full px-6 font-medium")}>
                Browse personnel
              </Link>
            </div>
            <Link href={emtHref} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors tracking-wide w-fit">
              I&apos;m an EMT — view your dashboard →
            </Link>
          </div>
        </div>

        {/* Assessment card mockup — md+ only */}
        <div className="hidden md:block relative w-[330px] lg:w-[392px] shrink-0">
          {/* soft red glow seating the card */}
          <div className="absolute -inset-10 bg-primary/[0.07] blur-3xl rounded-full pointer-events-none" />

          <div className="relative border border-border bg-card rounded-xl overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Risk Assessment</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-risk-low animate-standby-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-risk-low">Live</span>
              </span>
            </div>

            {/* event + score */}
            <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-foreground text-sm font-medium truncate">Lakeview Summer Festival</span>
                <span className="font-mono text-xs text-muted-foreground">Festival · 8,500 attendees · 6 hrs</span>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-3xl font-bold tabular-nums text-primary leading-none">74</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">/ 100 · High</div>
              </div>
            </div>

            {/* score bar */}
            <div className="px-5 pb-4">
              <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
                <div className="h-full w-[74%] rounded-full bg-gradient-to-r from-risk-low via-risk-medium to-primary" />
              </div>
            </div>

            {/* risk factors */}
            <div className="border-t border-border px-5 py-4 flex flex-col gap-2.5">
              {[
                { label: "Crowd density", width: "82%", color: "bg-risk-high" },
                { label: "Environmental exposure", width: "55%", color: "bg-risk-medium" },
                { label: "Activity profile", width: "30%", color: "bg-risk-low" },
              ].map(({ label, width, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="flex-1 text-xs text-muted-foreground">{label}</span>
                  <div className="w-24 lg:w-28 h-1 bg-border/60 rounded-full overflow-hidden shrink-0">
                    <div className={`h-full rounded-full ${color}`} style={{ width }} />
                  </div>
                </div>
              ))}
            </div>

            {/* staffing recommendation */}
            <div className="border-t border-border px-5 py-3.5 flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recommended</span>
              <span className="font-mono text-xs text-foreground">12× EMT-B · ALS advisory</span>
            </div>
          </div>

          {/* matched-EMT toast overlapping the card */}
          <div className="absolute -left-6 lg:-left-12 -bottom-7 flex items-center gap-3 border border-border bg-card rounded-lg shadow-xl shadow-black/40 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <span className="font-mono text-xs font-bold text-primary">MR</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground leading-tight">M. Rivera matched</span>
              <span className="font-mono text-[10px] text-muted-foreground">EMT-B · 2.1 mi away</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-risk-low shrink-0" />
          </div>
        </div>
      </div>
    </section>
  )
}
