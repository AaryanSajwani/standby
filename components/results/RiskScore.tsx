interface RiskScoreProps {
  score: number;
  level: string;
}

export function RiskScore({ score, level }: RiskScoreProps) {
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[180px] leading-none font-bold text-primary tracking-tighter">
          {score}
        </span>
        <span className="font-mono text-6xl text-muted-foreground">/10</span>
      </div>
      <div className="mt-4 border border-primary px-4 py-2">
        <span className="font-mono text-sm tracking-[0.2em] text-primary uppercase">
          {level}
        </span>
      </div>
    </div>
  );
}
