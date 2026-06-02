import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface StaffingCardProps {
  emtCount: number
  certLevel: string
  hours: number
  estimatedCost: string
}

export function StaffingCard({ emtCount, certLevel, hours, estimatedCost }: StaffingCardProps) {
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="pb-4">
        <span className="font-mono text-xs tracking-[0.2em] text-primary uppercase">
          Recommended Staffing Configuration
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="pb-4 md:pb-0 md:pr-6">
            <p className="font-mono text-3xl font-bold text-foreground">{emtCount}</p>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide mt-1">
              {certLevel} Recommended
            </p>
          </div>
          <div className="py-4 md:py-0 md:px-6">
            <p className="font-mono text-3xl font-bold text-foreground">{hours} hr</p>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide mt-1">
              Coverage Duration
            </p>
          </div>
          <div className="pt-4 md:pt-0 md:pl-6">
            <p className="font-mono text-3xl font-bold text-foreground">{estimatedCost}</p>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide mt-1">
              Estimated Cost
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
