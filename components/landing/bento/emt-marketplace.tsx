// Illustrative, honest-by-design: cert level is the real, verifiable context, so
// it's the primary label. No fabricated names/ratings/experience stats implying a
// supply that isn't there yet (Trust & honesty P0) — the differentiator this tile
// sells is license verification, not invented people.
const ROWS = [
  { badge: "EMT-B", label: "EMT-Basic", sub: "License-verified", available: true },
  { badge: "EMR", label: "First responder (EMR)", sub: "License-verified", available: true },
  { badge: "EMT-B", label: "EMT-Basic", sub: "License-verified", available: false },
  { badge: "EMT-B", label: "EMT-Basic", sub: "License-verified", available: true },
]

export default function EMTMarketplaceIllustration() {
  return (
    <div className="w-full h-full flex flex-col justify-center px-4 pb-4 gap-2">
      {ROWS.map(({ badge, label, sub, available }, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg bg-background/40 border border-border/40 px-3 py-2"
        >
          <div className="w-9 h-8 rounded-md bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-mono font-bold text-primary tabular-nums">{badge}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{label}</p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </div>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${available ? "bg-risk-low" : "bg-muted-foreground/40"}`} />
        </div>
      ))}
      <div className="mt-1 rounded-md bg-primary/10 border border-primary/20 px-3 py-1.5 text-center">
        <p className="text-xs font-medium text-primary">License-verified before they appear</p>
      </div>
    </div>
  )
}
