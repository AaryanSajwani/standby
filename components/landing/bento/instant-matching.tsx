import { MapPin, Zap } from "lucide-react"

const MATCHES = [
  { name: "Jordan K.", distance: "2.1 mi", cert: "Paramedic", match: 98 },
  { name: "Priya M.", distance: "3.4 mi", cert: "AEMT", match: 95 },
  { name: "Sam T.", distance: "4.0 mi", cert: "EMT-B", match: 91 },
]

export default function InstantMatchingIllustration() {
  return (
    <div className="w-full h-full flex flex-col justify-center px-4 pb-4 gap-3">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
        <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-medium text-primary">Matching to your event type & location...</span>
      </div>
      <div className="flex flex-col gap-2">
        {MATCHES.map(({ name, distance, cert, match }) => (
          <div key={name} className="flex items-center gap-3 rounded-lg bg-background/30 border border-border/40 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center flex-shrink-0 border border-border/60">
              <span className="text-xs font-mono font-bold text-primary">{name[0]}{name.split(" ")[1][0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{name} · {cert}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{distance}</span>
              </div>
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-xs font-mono font-bold text-emerald-400">{match}%</span>
              <span className="text-xs text-muted-foreground">match</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
