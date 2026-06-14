import Link from "next/link"
import { MapPin, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface EMTCardProps {
  id: string | number
  name: string
  certification: "EMT-B" | "EMT-P" | "First Responder" | "AEMT"
  yearsExperience?: number
  eventTypes: string[]
  radiusMiles: number
  available: boolean
  hourlyRate: number
  verified?: boolean
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const letters = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)
  return letters.toUpperCase()
}

export function EMTCard({
  id,
  name,
  certification,
  yearsExperience,
  eventTypes,
  radiusMiles,
  available,
  hourlyRate,
  verified,
}: EMTCardProps) {
  return (
    <div className="group flex flex-col bg-card border border-border hover:border-primary/40 transition-colors">
      {/* Header — monogram, name, cert, availability */}
      <div className="flex items-start gap-3 p-4 border-b border-border">
        <div className="h-12 w-12 shrink-0 border border-border bg-secondary flex items-center justify-center">
          <span className="font-mono text-sm font-bold text-muted-foreground uppercase">{initialsOf(name)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground leading-tight truncate">{name}</h3>
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
              {certification}
            </Badge>
            {verified && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest border border-primary/30 bg-primary/5 text-primary px-1.5 py-0.5">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            available
              ? "font-mono text-[10px] uppercase tracking-wider border-risk-low text-risk-low bg-risk-low/10"
              : "font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          }
        >
          {available ? "Available" : "Booked"}
        </Badge>
      </div>

      {/* Body — rate, experience, specializations, radius */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">${hourlyRate}</span>
            <span className="font-mono text-xs text-muted-foreground">/hr</span>
          </div>
          {(yearsExperience ?? 0) > 0 && (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {yearsExperience} yr experience
            </span>
          )}
        </div>

        {eventTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {eventTypes.slice(0, 3).map((type) => (
              <Badge key={type} variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
                {type}
              </Badge>
            ))}
            {eventTypes.length > 3 && (
              <Badge variant="secondary" className="font-mono text-[10px] text-muted-foreground">
                +{eventTypes.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-muted-foreground mt-auto">
          <MapPin className="w-3.5 h-3.5" />
          <span className="font-mono text-xs tabular-nums">Up to {radiusMiles} mi</span>
        </div>
      </div>

      {/* CTA */}
      <div className="p-4 pt-0">
        <Link
          href={`/emt/${id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full font-mono text-xs uppercase tracking-wider")}
        >
          View profile
        </Link>
      </div>
    </div>
  )
}
