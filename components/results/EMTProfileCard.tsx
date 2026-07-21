import { MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface EMTProfileCardProps {
  name: string
  certLevel: string
  yearsExperience: number
  radiusMiles: number
  available: boolean
  onRequestStaffing?: () => void
}

export function EMTProfileCard({
  name,
  certLevel,
  yearsExperience,
  radiusMiles,
  available,
  onRequestStaffing,
}: EMTProfileCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardContent className="flex flex-col flex-1 pt-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-medium text-foreground text-lg">{name}</h3>
            <Badge variant="secondary" className="font-mono text-xs tracking-wider mt-1">
              {certLevel}
            </Badge>
          </div>
          <Badge
            variant="outline"
            className={
              available
                ? "font-mono text-xs border-risk-low text-risk-low bg-risk-low/10"
                : "font-mono text-xs text-muted-foreground"
            }
          >
            {available ? "Available" : "Unavailable"}
          </Badge>
        </div>

        <div className="space-y-2.5 flex-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Experience</span>
            <span className="font-mono text-foreground">{yearsExperience} years</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service radius</span>
            <span className="font-mono text-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {radiusMiles} mi
            </span>
          </div>
        </div>

        <Button
          disabled={!available}
          onClick={onRequestStaffing}
          className="mt-5 w-full font-mono text-xs tracking-wider uppercase"
          size="sm"
        >
          Request coverage
        </Button>
      </CardContent>
    </Card>
  )
}
