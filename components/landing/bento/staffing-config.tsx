const BARS = [
  { label: "EMT-B", count: 6, max: 8, color: "bg-risk-low" },
  { label: "EMR", count: 3, max: 8, color: "bg-risk-medium" },
  { label: "Medical Dir.", count: 1, max: 8, color: "bg-chart-2" },
]

export default function StaffingConfigIllustration() {
  return (
    <div className="w-full h-full flex flex-col justify-center px-4 pb-4 gap-4">
      <div className="rounded-lg border border-border/40 bg-background/30 p-4 flex flex-col gap-3">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Recommended Staffing</p>
        <div className="flex flex-col gap-2.5">
          {BARS.map(({ label, count, max, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
              <div className="flex-1 h-2 bg-border/40 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono font-medium text-foreground w-4 flex-shrink-0">{count}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <span className="text-xs text-muted-foreground">Total personnel</span>
          <span className="text-xs font-mono font-bold text-foreground">10</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Based on 8,500 attendees · outdoor venue · 6hr duration
      </p>
    </div>
  )
}
