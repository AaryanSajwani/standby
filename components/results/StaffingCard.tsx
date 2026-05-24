interface StaffingCardProps {
  emtCount: number;
  certLevel: string;
  hours: number;
  estimatedCost: string;
}

export function StaffingCard({
  emtCount,
  certLevel,
  hours,
  estimatedCost,
}: StaffingCardProps) {
  return (
    <section className="border border-primary bg-card p-6">
      <h2 className="font-mono text-xs tracking-[0.2em] text-primary uppercase mb-6">
        Recommended Staffing Configuration
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p className="font-mono text-2xl text-foreground">{emtCount}</p>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide">{certLevel} recommended</p>
        </div>

        <div>
          <p className="font-mono text-2xl text-foreground">{hours} hr</p>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide">coverage duration</p>
        </div>

        <div>
          <p className="font-mono text-2xl text-foreground">{estimatedCost}</p>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide">estimated cost</p>
        </div>
      </div>
    </section>
  );
}
