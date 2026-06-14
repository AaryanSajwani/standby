import { Music, Footprints, Building2, Trophy, type LucideIcon } from "lucide-react"

const EVENT_TYPES: { label: string; Icon: LucideIcon; rate: string; risk: string }[] = [
  { label: "Music Festival", Icon: Music, rate: "1.4%", risk: "High" },
  { label: "5K Race", Icon: Footprints, rate: "0.6%", risk: "Low" },
  { label: "Corporate", Icon: Building2, rate: "0.3%", risk: "Low" },
  { label: "Sporting Event", Icon: Trophy, rate: "0.9%", risk: "Medium" },
]

const RISK_COLOR: Record<string, string> = {
  High: "text-risk-high",
  Medium: "text-risk-medium",
  Low: "text-risk-low",
}

export default function EventIntelligenceIllustration() {
  return (
    <div className="w-full h-full flex flex-col justify-center px-4 pb-4 gap-3">
      <div className="flex flex-col gap-2">
        {EVENT_TYPES.map(({ label, Icon, rate, risk }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg bg-background/30 border border-border/40 px-3 py-2"
          >
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-xs font-medium text-foreground">{label}</span>
            <span className="text-xs font-mono tabular-nums text-muted-foreground">{rate} PPR</span>
            <span className={`text-xs font-medium ${RISK_COLOR[risk]}`}>{risk}</span>
          </div>
        ))}
      </div>
      <div className="rounded-md bg-card/60 border border-border/40 px-3 py-2 text-center">
        <p className="text-xs text-muted-foreground">
          Patient-presentation benchmarks from <span className="text-foreground font-medium">event-medicine research</span>
        </p>
      </div>
    </div>
  )
}
