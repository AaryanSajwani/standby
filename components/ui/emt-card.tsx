"use client"

import { useState } from "react"
import Link from "next/link"
import { MapPin, Star, Heart, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface EMTCardProps {
  id: string | number
  name: string
  certification: "EMT-B" | "EMT-P" | "First Responder" | "AEMT"
  yearsExperience?: number
  eventTypes: string[]
  radiusMiles: number
  available: boolean
  rating?: number
  reviewCount?: number
  hourlyRate: number
  avatar?: string
  completedEvents?: number
  verified?: boolean
}

// Brand-tier ramp: red intensity tracks certification level.
const certificationVariant: Record<string, string> = {
  "EMT-P":           "bg-primary text-primary-foreground hover:bg-primary",
  "AEMT":            "bg-primary/15 text-primary-light border border-primary/30 hover:bg-primary/15",
  "EMT-B":           "bg-secondary text-foreground border border-border hover:bg-secondary",
  "First Responder": "bg-muted text-muted-foreground border border-border hover:bg-muted",
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ")
  const letters = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : name.slice(0, 2)
  return (
    <div className="h-20 w-20 rounded-full border-4 border-card bg-secondary flex items-center justify-center">
      <span className="font-mono text-lg font-bold text-muted-foreground uppercase">
        {letters}
      </span>
    </div>
  )
}

export function EMTCard({
  id,
  name,
  certification,
  yearsExperience,
  eventTypes,
  radiusMiles,
  available,
  rating,
  reviewCount,
  hourlyRate,
  avatar,
  completedEvents,
  verified,
}: EMTCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const hasStats = (rating ?? 0) > 0 || (reviewCount ?? 0) > 0 || (completedEvents ?? 0) > 0 || (yearsExperience ?? 0) > 0

  return (
    <div
      className="group bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover / status banner */}
      <div className="relative h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked) }}
        >
          <Heart className={`h-4 w-4 transition-colors ${isLiked ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </Button>

        {available && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium text-primary">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Online
          </div>
        )}
      </div>

      {/* Profile content */}
      <div className="relative px-4 pb-4">
        {/* Avatar */}
        <div className="absolute -top-10 left-4">
          <div className="relative">
            {avatar ? (
              <img src={avatar} alt={name} className="h-20 w-20 rounded-full border-4 border-card object-cover" />
            ) : (
              <Initials name={name} />
            )}
            <span className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-card ${available ? "bg-risk-low" : "bg-muted-foreground"}`} />
          </div>
        </div>

        <div className="pt-12">
          {/* Name, cert, rate */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              <h3 className="font-semibold text-foreground text-lg leading-tight">{name}</h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge className={`text-xs font-semibold ${certificationVariant[certification]}`}>
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
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">${hourlyRate}</p>
              <p className="text-xs text-muted-foreground">/hour</p>
            </div>
          </div>

          {/* Rating & stats — only shown when data exists */}
          {hasStats && (
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {(rating ?? 0) > 0 && (
                <>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-risk-medium text-risk-medium" />
                    <span className="font-semibold text-foreground">{rating!.toFixed(1)}</span>
                    {(reviewCount ?? 0) > 0 && (
                      <span className="text-muted-foreground text-sm">({reviewCount})</span>
                    )}
                  </div>
                  <span className="text-muted-foreground">·</span>
                </>
              )}
              {(completedEvents ?? 0) > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">{completedEvents} events</span>
                  <span className="text-muted-foreground">·</span>
                </>
              )}
              {(yearsExperience ?? 0) > 0 && (
                <span className="text-sm text-muted-foreground">{yearsExperience}yr exp</span>
              )}
            </div>
          )}

          {/* Event type tags */}
          {eventTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {eventTypes.slice(0, 3).map((type) => (
                <Badge key={type} variant="secondary" className="text-xs font-medium">{type}</Badge>
              ))}
              {eventTypes.length > 3 && (
                <Badge variant="secondary" className="text-xs font-medium text-muted-foreground">
                  +{eventTypes.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-1.5 mt-3 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-sm">Up to {radiusMiles} miles</span>
          </div>

          {/* CTA — visible on hover */}
          <div className={`mt-4 transition-all duration-300 ${isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
            <Button render={<Link href={`/emt/${id}`} />} className="w-full" variant="secondary">
              View profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
