import Link from "next/link"
import { ArrowLeft, Shield, MapPin, Clock, ShieldCheck, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { CERT_DISPLAY, EMT_PUBLIC_COLUMNS, joinedFullName } from "@/lib/emt"
import { RequestEmt } from "./request-emt"

interface EMTProfile {
  name: string
  certification: string
  eventTypes: string[]
  radiusMiles: number
  available: boolean
  bio: string
  yearsExperience?: number
  hourlyRate?: number
  location?: string
  verified?: boolean
}

// Mock data — kept for the numeric sample-profile ids shown when no
// verified EMTs exist yet. Real profiles use UUID ids and hit Supabase.
const MOCK_EMT_DATA: Record<number, EMTProfile> = {
  1:  { name: "Marcus Chen",      certification: "EMT-P",          yearsExperience: 8,  eventTypes: ["Concerts", "Sports", "Festivals"],               radiusMiles: 50,  available: true,  bio: "Paramedic with 8 years of mass-gathering event experience. Specializes in high-density crowd medicine and rapid triage protocols." },
  2:  { name: "Sarah Mitchell",   certification: "EMT-B",          yearsExperience: 4,  eventTypes: ["Corporate", "Private Events"],                   radiusMiles: 25,  available: true,  bio: "EMT-Basic focused on corporate and private event coverage. Known for calm patient management and thorough documentation." },
  3:  { name: "David Rodriguez",  certification: "EMT-P",          yearsExperience: 12, eventTypes: ["Film & TV", "Concerts", "Sports"],               radiusMiles: 75,  available: false, bio: "Senior paramedic with extensive production set and live event experience across 12 years of field work." },
  4:  { name: "Emily Thompson",   certification: "First Responder", yearsExperience: 2,  eventTypes: ["Corporate", "Festivals"],                        radiusMiles: 30,  available: true,  bio: "Certified first responder with strong festival and corporate event background. Currently completing EMT-B coursework." },
  5:  { name: "James Wilson",     certification: "EMT-B",          yearsExperience: 6,  eventTypes: ["Sports", "Concerts"],                            radiusMiles: 40,  available: true,  bio: "Six years covering collegiate and professional sporting events. Experienced in athletic injury assessment and sideline protocols." },
  6:  { name: "Lisa Nakamura",    certification: "EMT-P",          yearsExperience: 10, eventTypes: ["Film & TV", "Private Events", "Corporate"],      radiusMiles: 60,  available: true,  bio: "Paramedic specializing in high-profile private and production events. Holds additional certifications in tactical medicine." },
  7:  { name: "Robert Garcia",    certification: "EMT-B",          yearsExperience: 3,  eventTypes: ["Festivals", "Concerts"],                         radiusMiles: 35,  available: false, bio: "EMT-Basic with 3 years of outdoor festival experience including multi-day events and remote venue operations." },
  8:  { name: "Amanda Foster",    certification: "EMT-B",          yearsExperience: 5,  eventTypes: ["Sports", "Corporate"],                           radiusMiles: 45,  available: true,  bio: "Five years of corporate and sports event coverage. Experienced coordinator for multi-unit event medical teams." },
  9:  { name: "Michael Park",     certification: "EMT-P",          yearsExperience: 15, eventTypes: ["Concerts", "Festivals", "Film & TV", "Sports"],  radiusMiles: 100, available: true,  bio: "Senior paramedic with 15 years across every major event category. Frequent medical director for large-scale productions." },
  10: { name: "Jennifer Adams",   certification: "First Responder", yearsExperience: 1,  eventTypes: ["Private Events"],                               radiusMiles: 20,  available: true,  bio: "Recent first responder certification with private event focus. Strong patient communication and documentation skills." },
  11: { name: "Christopher Lee",  certification: "EMT-B",          yearsExperience: 7,  eventTypes: ["Sports", "Festivals", "Concerts"],               radiusMiles: 55,  available: false, bio: "Seven years of live event coverage across sporting, festival, and concert venues. CPR and AED instructor certified." },
  12: { name: "Rachel Kim",       certification: "EMT-P",          yearsExperience: 9,  eventTypes: ["Film & TV", "Corporate"],                        radiusMiles: 70,  available: true,  bio: "Paramedic with deep film and television production experience. Familiar with SAG-AFTRA set safety protocols." },
  13: { name: "Daniel Brown",     certification: "EMT-B",          yearsExperience: 4,  eventTypes: ["Concerts", "Private Events"],                    radiusMiles: 30,  available: true,  bio: "Four years of concert and private event coverage. Experienced with general admission crowd management scenarios." },
  14: { name: "Nicole Martinez",  certification: "EMT-B",          yearsExperience: 6,  eventTypes: ["Festivals", "Sports", "Corporate"],              radiusMiles: 45,  available: true,  bio: "Versatile EMT-Basic covering festivals, sporting events, and corporate functions. Bilingual — English and Spanish." },
  15: { name: "Kevin O'Brien",    certification: "EMT-P",          yearsExperience: 11, eventTypes: ["Sports", "Concerts", "Film & TV"],               radiusMiles: 65,  available: true,  bio: "Eleven years as paramedic across sports, concerts, and film productions. Former collegiate athlete with strong sports medicine background." },
}

async function getEmt(id: string): Promise<EMTProfile | null> {
  // Numeric ids are mock sample profiles
  if (/^\d+$/.test(id)) return MOCK_EMT_DATA[parseInt(id, 10)] ?? null

  // UUID ids are real profiles. Explicit column list only — RLS lets the
  // public see verified rows (and owners their own), but credential PII
  // (license_number etc.) must never be selected here.
  const supabase = await createClient()
  const { data } = await supabase
    .from("emt_profiles")
    .select(`${EMT_PUBLIC_COLUMNS}, profiles!inner ( full_name )`)
    .eq("user_id", id)
    .maybeSingle()

  if (!data) return null

  return {
    name:          joinedFullName(data.profiles) ?? "Unknown EMT",
    certification: CERT_DISPLAY[data.cert_level] ?? "EMT-B",
    eventTypes:    Array.isArray(data.specializations) ? data.specializations : [],
    radiusMiles:   data.service_radius_miles ?? 0,
    available:     data.available ?? false,
    bio:           data.bio ?? "No background provided yet.",
    hourlyRate:    data.hourly_rate ?? undefined,
    location:      [data.city, data.state].filter(Boolean).join(", "),
    verified:      data.verified ?? false,
  }
}

export default async function EMTProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const emt = await getEmt(id)
  const isReal = !/^\d+$/.test(id)

  // Who's viewing — drives the Request CTA (sign-in redirect vs form)
  const supabase = await createClient()
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser()

  if (!emt) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <span className="text-xs font-mono text-primary uppercase tracking-widest">404</span>
          <p className="text-muted-foreground text-sm">EMT profile not found.</p>
          <Link href="/personnel" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Back to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Breadcrumb header */}
      <div className="border-b border-border bg-surface/80 px-8 py-4 flex items-center gap-3 shrink-0">
        <Link href="/personnel" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground gap-1.5 -ml-2")}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Personnel
        </Link>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          EMT Profile
        </span>
      </div>

      <div className="max-w-4xl mx-auto w-full px-8 py-10 space-y-6">
        {/* Name + badges */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="font-mono text-xs tracking-wider uppercase">
              {emt.certification}
            </Badge>
            {emt.verified && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest border border-primary/30 bg-primary/5 text-primary px-2 py-0.5">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            )}
            <Badge
              variant="outline"
              className={
                emt.available
                  ? "font-mono text-xs border-risk-low text-risk-low bg-risk-low/10"
                  : "font-mono text-xs text-muted-foreground"
              }
            >
              {emt.available ? "Available" : "Unavailable"}
            </Badge>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">{emt.name}</h1>
          {emt.location && (
            <p className="font-mono text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {emt.location}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 border border-border divide-x divide-border">
          <div className="px-6 py-5">
            {emt.yearsExperience !== undefined ? (
              <>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                  Experience
                </p>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-2xl font-bold tabular-nums">{emt.yearsExperience}</span>
                  <span className="text-sm text-muted-foreground">years</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                  Rate
                </p>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-2xl font-bold tabular-nums">{emt.hourlyRate ?? "—"}</span>
                  <span className="text-sm text-muted-foreground">/hour</span>
                </div>
              </>
            )}
          </div>
          <div className="px-6 py-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Service Radius
            </p>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-2xl font-bold tabular-nums">{emt.radiusMiles}</span>
              <span className="text-sm text-muted-foreground">miles</span>
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Availability
            </p>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm">
                {emt.available ? "Available for booking" : "Currently booked"}
              </span>
            </div>
          </div>
        </div>

        {/* Background */}
        <Card>
          <CardHeader className="pb-0">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Background
            </span>
          </CardHeader>
          <CardContent className="pt-3">
            <p className="text-foreground/90 leading-relaxed">{emt.bio}</p>
          </CardContent>
        </Card>

        {/* Event Types */}
        {emt.eventTypes.length > 0 && (
          <Card>
            <CardHeader className="pb-0">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Event Type Experience
              </span>
            </CardHeader>
            <CardContent className="pt-3 flex flex-wrap gap-2">
              {emt.eventTypes.map((type) => (
                <Badge key={type} variant="secondary" className="font-mono text-xs uppercase tracking-wider">
                  {type}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        {isReal ? (
          <RequestEmt
            emtId={id}
            emtName={emt.name}
            hourlyRate={emt.hourlyRate ?? 0}
            available={emt.available}
            viewerId={viewer?.id ?? null}
          />
        ) : (
          // Sample profiles aren't bookable — no real user behind them
          <div className="flex items-center gap-3">
            <Button
              disabled
              className="font-mono text-xs tracking-wider uppercase px-8"
            >
              Sample profile
            </Button>
            <Link href="/personnel" className={cn(buttonVariants({ variant: "outline" }), "font-mono text-xs tracking-wider uppercase")}>
              Browse More Personnel
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
