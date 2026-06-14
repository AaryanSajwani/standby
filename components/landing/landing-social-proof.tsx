// Honest early-stage trust. No fabricated scale metrics — these are product
// facts that hold true on day one, not invented counts. See STANDBY-IMPROVEMENTS §1.
const PRINCIPLES = [
  { value: "< 4 min", label: "From event details to a defensible staffing recommendation" },
  { value: "Guideline-based", label: "Calibrated to mass-gathering medicine literature" },
  { value: "License-checked", label: "Every EMT is verified before they appear in personnel" },
  { value: "Early access", label: "Onboarding our first cohort of organizers and EMTs" },
]

export function LandingSocialProof() {
  return (
    <section className="self-stretch py-12 md:py-16 flex flex-col justify-center items-center gap-8">
      <div className="text-center text-muted-foreground text-sm font-medium">
        Built for the people who answer to the authority having jurisdiction
      </div>
      <div className="w-full max-w-[900px] grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40 rounded-xl overflow-hidden border border-border/40">
        {PRINCIPLES.map(({ value, label }) => (
          <div key={label} className="bg-card/60 px-6 py-6 flex flex-col gap-2 items-center text-center">
            <span className="font-mono text-base md:text-lg font-bold text-foreground tracking-tight">{value}</span>
            <span className="text-xs text-muted-foreground leading-snug">{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
