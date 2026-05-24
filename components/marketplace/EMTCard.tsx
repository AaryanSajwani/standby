"use client"

import Link from "next/link"
import { MapPin } from "lucide-react"

interface EMTCardProps {
  id: number
  name: string
  certification: "EMT-B" | "EMT-P" | "First Responder"
  yearsExperience: number
  eventTypes: string[]
  radiusMiles: number
  available: boolean
}

export function EMTCard({
  id,
  name,
  certification,
  yearsExperience,
  eventTypes,
  radiusMiles,
  available,
}: EMTCardProps) {
  return (
    <div className="border-r border-b border-border bg-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-sans font-bold text-foreground text-base tracking-tight">
              {name}
            </h3>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 ${available ? "bg-emerald-500" : "bg-muted-foreground"}`}
                aria-label={available ? "Available" : "Unavailable"}
              />
              <span className={`font-mono text-[10px] uppercase tracking-wider ${available ? "text-emerald-500" : "text-muted-foreground"}`}>
                {available ? "Available" : "Unavailable"}
              </span>
            </div>
          </div>
          <span className="inline-flex self-start bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground uppercase tracking-wide">
            {certification}
          </span>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            Experience
          </p>
          <p className="font-mono text-lg text-foreground tabular-nums">
            {yearsExperience} <span className="text-xs text-muted-foreground">YRS</span>
          </p>
        </div>
      </div>

      {/* Event Types */}
      <div className="flex flex-wrap gap-1.5">
        {eventTypes.map((type) => (
          <span
            key={type}
            className="border border-border px-2 py-1 text-xs font-sans text-muted-foreground uppercase tracking-wide"
          >
            {type}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="font-mono text-xs tabular-nums">
            {radiusMiles} <span className="text-muted-foreground">MI RADIUS</span>
          </span>
        </div>
        <Link
          href={`/emt/${id}`}
          className="border border-primary px-4 py-2 text-xs font-sans font-semibold text-primary uppercase tracking-wide hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          View Profile
        </Link>
      </div>
    </div>
  )
}
