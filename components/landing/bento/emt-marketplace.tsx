const EMTS = [
  { initials: "KJ", name: "K. Johnson", cert: "EMT-B", exp: "8 yrs", available: true },
  { initials: "MR", name: "M. Rivera", cert: "EMT-B", exp: "12 yrs", available: true },
  { initials: "AT", name: "A. Torres", cert: "EMR", exp: "3 yrs", available: false },
  { initials: "SP", name: "S. Patel", cert: "EMT-B", exp: "6 yrs", available: true },
]

export default function EMTMarketplaceIllustration() {
  return (
    <div className="w-full h-full flex flex-col justify-center px-4 pb-4 gap-2">
      {EMTS.map(({ initials, name, cert, exp, available }) => (
        <div
          key={name}
          className="flex items-center gap-3 rounded-lg bg-background/40 border border-border/40 px-3 py-2"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-mono font-bold text-primary">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{name}</p>
            <p className="text-xs text-muted-foreground">{cert} · {exp}</p>
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
