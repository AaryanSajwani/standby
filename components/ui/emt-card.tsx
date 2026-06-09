"use client"

import { useState } from "react"
import Link from "next/link"
import { MapPin, Star, Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface EMTCardProps {
  id: number
  name: string
  certification: "EMT-B" | "EMT-P" | "First Responder"
  yearsExperience: number
  eventTypes: string[]
  radiusMiles: number
  available: boolean
  rating: number
  reviewCount: number
  hourlyRate: number
  avatar: string
  completedEvents: number
}

const certificationVariant: Record<string, string> = {
  "EMT-P": "bg-amber-500 text-white hover:bg-amber-500",
  "EMT-B": "bg-blue-500 text-white hover:bg-blue-500",
  "First Responder": "bg-purple-500 text-white hover:bg-purple-500",
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
}: EMTCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

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
          onClick={(e) => {
            e.stopPropagation()
            setIsLiked(!isLiked)
          }}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
          />
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
            <img
              src={avatar}
              alt={name}
              className="h-20 w-20 rounded-full border-4 border-card object-cover"
            />
            <span
              className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-card ${
                available ? "bg-risk-low" : "bg-muted-foreground"
              }`}
            />
          </div>
        </div>

        <div className="pt-12">
          {/* Name, cert, rate */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground text-lg leading-tight">{name}</h3>
              <Badge className={`mt-1 text-xs font-semibold ${certificationVariant[certification]}`}>
                {certification}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">${hourlyRate}</p>
              <p className="text-xs text-muted-foreground">/hour</p>
            </div>
          </div>

          {/* Rating & stats */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">({reviewCount})</span>
            </div>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{completedEvents} events</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{yearsExperience}yr exp</span>
          </div>

          {/* Event type tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {eventTypes.slice(0, 3).map((type) => (
              <Badge key={type} variant="secondary" className="text-xs font-medium">
                {type}
              </Badge>
            ))}
            {eventTypes.length > 3 && (
              <Badge variant="secondary" className="text-xs font-medium text-muted-foreground">
                +{eventTypes.length - 3}
              </Badge>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 mt-3 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-sm">Up to {radiusMiles} miles</span>
          </div>

          {/* CTA — visible on hover */}
          <div
            className={`mt-4 transition-all duration-300 ${
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <Button render={<Link href={`/emt/${id}`} />} className="w-full" variant="secondary">
              View profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
