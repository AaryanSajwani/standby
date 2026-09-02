import { RiskProfilePanel } from "@/components/assessment/RiskProfilePanel"
import { EXAMPLE_ASSESSMENT } from "./risk-preview"

// A read-only mirror of the real Step-1 fields, filled with the example event.
function Field({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="h-10 flex items-center px-3 border border-border bg-input">
        <span className={`font-mono text-sm ${highlight ? "text-risk-medium" : "text-foreground"}`}>{value}</span>
      </div>
    </div>
  )
}

/**
 * The strongest asset on the page: the actual assessment, not a mockup. The right
 * pane is the real RiskProfilePanel scored by the live engine; the left mirrors the
 * Step-1 inputs that produced it. A screenshot of working software is the one thing
 * a template can't have — this is better than a screenshot because it's live.
 */
export function LiveAssessment() {
  return (
    <section className="w-full px-5 flex flex-col items-center gap-8 py-8 md:py-14">
      <div className="flex flex-col items-center gap-4 max-w-[720px] text-center">
        <h2 className="text-foreground text-3xl md:text-5xl font-semibold leading-tight">
          Five questions. A real risk score.
        </h2>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
          No black box. Every factor is visible and every number traces back to a reason.
        </p>
      </div>

      {/* App-window frame */}
      <div className="w-full max-w-[1120px] rounded-2xl border border-border bg-surface overflow-hidden">
        {/* top bar */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-1 w-6 rounded-full ${i === 0 ? "bg-primary" : "bg-border"}`} />
              ))}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Step 1 of 5</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:block">
            Current phase: <span className="text-foreground">Event Details</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 md:items-stretch md:divide-x divide-border">
          {/* Left — the Step-1 form, filled (read-only mirror) */}
          <div className="px-6 py-7 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h3 className="text-foreground text-lg font-semibold">Event Details</h3>
              <p className="text-muted-foreground text-xs">Basic information about the event requiring medical coverage.</p>
            </div>
            <Field label="Event name" value={EXAMPLE_ASSESSMENT.eventName} />
            <Field label="Event type" value="Festival (Multi-day)" />
            <Field label="Expected attendance" value={parseInt(EXAMPLE_ASSESSMENT.expectedAttendance).toLocaleString()} highlight />
            <Field label="Event date" value="07 / 18 / 2026" />
            <div className="flex items-center justify-between pt-2 mt-auto">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">All fields required</span>
              <span className="font-mono text-[10px] uppercase tracking-wider border border-border text-muted-foreground px-3 py-1.5">Continue to step 2</span>
            </div>
          </div>

          {/* Right — the real live-scoring panel */}
          <div className="bg-background">
            <RiskProfilePanel formData={EXAMPLE_ASSESSMENT} />
          </div>
        </div>
      </div>

      <p className="font-mono text-[11px] text-muted-foreground text-center max-w-[640px]">
        The panel on the right is the actual Standby scoring engine — the same one that runs your assessment, computing this example in real time.
      </p>
    </section>
  )
}
