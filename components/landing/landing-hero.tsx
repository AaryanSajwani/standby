import React from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function LandingHero() {
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
            "linear-gradient(to right, #2D3F5F33 1px, transparent 1px), linear-gradient(to bottom, #2D3F5F33 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Primary red radial glow — top right, like old homepage */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse 70% 55% at 85% -5%, #E8404A20, transparent)",
        }}
      />
      {/* Subtle blue vignette at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-0"
        style={{ background: "linear-gradient(to top, #1B2A4A, transparent)" }}
      />
      {/* Border frame */}
      <div className="absolute inset-0 rounded-2xl border border-border/40 pointer-events-none z-10" />

      {/* Decorative highlighted grid cells */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute" style={{ top: 81, left: 699, width: 36, height: 36, background: "#E8EAED0A" }} />
        <div className="absolute" style={{ top: 153, left: 195, width: 36, height: 36, background: "#E8EAED0C" }} />
        <div className="absolute" style={{ top: 225, left: 1095, width: 36, height: 36, background: "#E8EAED0C" }} />
        <div className="absolute" style={{ top: 405, left: 87, width: 36, height: 36, background: "#E8EAED0C" }} />
        <div className="absolute" style={{ top: 405, left: 771, width: 36, height: 36, background: "#E8404A0A" }} />
        <div className="absolute" style={{ top: 333, left: 231, width: 36, height: 36, background: "#E8404A08" }} />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 space-y-4 md:space-y-5 lg:space-y-6 mb-6 md:mb-8 lg:mb-10 max-w-md md:max-w-[520px] lg:max-w-[620px] mt-12 md:mt-20 lg:mt-28 px-4 text-left">
        <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/5 rounded-full px-3 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
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
            <Link href="/assess" className={cn(buttonVariants(), "rounded-full px-6 font-medium shadow-lg shadow-primary/20")}>
              Start Assessment
            </Link>
            <Link href="/personnel" className={cn(buttonVariants({ variant: "outline" }), "rounded-full px-6 font-medium")}>
              Browse Personnel
            </Link>
          </div>
          <Link href="/emt-dashboard" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors tracking-wide w-fit">
            I&apos;m an EMT — view your dashboard →
          </Link>
        </div>
      </div>
    </section>
  )
}
