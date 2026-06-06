const EVENT_TYPES = [
  { label: "Music Festival", icon: "🎵", rate: "3.1%", risk: "High" },
  { label: "5K Race", icon: "🏃", rate: "0.8%", risk: "Low" },
  { label: "Corporate", icon: "🏢", rate: "0.4%", risk: "Low" },
  { label: "Sporting Event", icon: "⚽", rate: "1.9%", risk: "Medium" },
]

const RISK_COLOR: Record<string, string> = {
  High: "text-red-400",
  Medium: "text-amber-400",
  Low: "text-emerald-400",
}

export default function EventIntelligenceIllustration() {
  return (
    <div className="w-full h-full flex flex-col justify-center px-4 pb-4 gap-3">
      <div className="flex flex-col gap-2">
        {EVENT_TYPES.map(({ label, icon, rate, risk }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg bg-background/30 border border-border/40 px-3 py-2"
          >
            <span className="text-base">{icon}</span>
            <span className="flex-1 text-xs font-medium text-foreground">{label}</span>
            <span className="text-xs font-mono text-muted-foreground">{rate} PPR</span>
            <span className={`text-xs font-medium ${RISK_COLOR[risk]}`}>{risk}</span>
          </div>
        ))}
      </div>
      <div className="rounded-md bg-card/60 border border-border/40 px-3 py-2 text-center">
        <p className="text-xs text-muted-foreground">AI trained on <span className="text-foreground font-medium">2,500+</span> real events</p>
      </div>
    </div>
  )
}
