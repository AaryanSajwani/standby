import { Badge } from "@/components/ui/badge"

interface RiskScoreProps {
  score: number
  level: string
}

const LEVEL_STYLES: Record<string, string> = {
  "LOW":      "border-risk-low text-risk-low bg-risk-low/10",
  "MODERATE": "border-risk-medium text-risk-medium bg-risk-medium/10",
  "HIGH":     "border-risk-high text-risk-high bg-risk-high/10",
  "CRITICAL": "border-destructive text-destructive bg-destructive/10",
}

export function RiskScore({ score, level }: RiskScoreProps) {
  const badgeStyle = LEVEL_STYLES[level.toUpperCase()] ?? "border-primary text-primary bg-primary/10"

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[160px] leading-none font-bold text-primary tracking-tighter">
          {score}
        </span>
        <span className="font-mono text-5xl text-muted-foreground">/10</span>
      </div>
      <Badge
        variant="outline"
        className={`font-mono text-sm tracking-[0.2em] uppercase px-4 py-1.5 ${badgeStyle}`}
      >
        {level} Risk
      </Badge>
    </div>
  )
}
