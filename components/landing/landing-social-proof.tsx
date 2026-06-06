const STATS = [
  { value: "340+", label: "Certified EMTs on Platform" },
  { value: "2,500+", label: "Events Assessed" },
  { value: "< 4 min", label: "Assessment Turnaround" },
  { value: "98%", label: "First-Submission AHJ Approval Rate" },
]

export function LandingSocialProof() {
  return (
    <section className="self-stretch py-12 md:py-16 flex flex-col justify-center items-center gap-8">
      <div className="text-center text-muted-foreground text-sm font-medium">
        Trusted by event coordinators nationwide
      </div>
      <div className="w-full max-w-[900px] grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40 rounded-xl overflow-hidden border border-border/40">
        {STATS.map(({ value, label }) => (
          <div key={label} className="bg-card/60 px-6 py-6 flex flex-col gap-1 items-center text-center">
            <span className="font-mono text-2xl md:text-3xl font-bold text-foreground">{value}</span>
            <span className="text-xs text-muted-foreground leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
