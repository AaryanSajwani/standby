export default function RiskScoringIllustration() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6 pb-6 gap-4">
      {/* Gauge arc */}
      <div className="relative w-40 h-20 overflow-hidden">
        <svg viewBox="0 0 160 80" className="w-full h-full">
          {/* Background arc */}
          <path d="M 10 80 A 70 70 0 0 1 150 80" stroke="var(--border)" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Low risk segment */}
          <path d="M 10 80 A 70 70 0 0 1 56 22" stroke="var(--risk-low)" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Medium risk segment */}
          <path d="M 56 22 A 70 70 0 0 1 104 22" stroke="var(--risk-medium)" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* High risk segment */}
          <path d="M 104 22 A 70 70 0 0 1 150 80" stroke="var(--risk-high)" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Needle */}
          <line x1="80" y1="80" x2="60" y2="28" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="80" cy="80" r="5" fill="var(--foreground)" />
        </svg>
      </div>
      {/* Risk labels */}
      <div className="w-full flex flex-col gap-2">
        {[
          { label: "Crowd density", value: "High", color: "text-risk-high" },
          { label: "Proximity to definitive care", value: "8.2 mi", color: "text-risk-medium" },
          { label: "Patient presentation rate", value: "1.4%", color: "text-risk-low" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className={`font-mono tabular-nums font-medium ${color}`}>{value}</span>
          </div>
        ))}
      </div>
      <div className="w-full rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-center">
        <p className="text-xs text-muted-foreground">Risk level</p>
        <p className="font-mono text-xl font-bold tabular-nums text-primary">7 / 10</p>
      </div>
    </div>
  )
}
