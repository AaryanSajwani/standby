import Link from "next/link"
import { ArrowLeft, Shield, MapPin, Clock } from "lucide-react"

// Mock data — will be replaced by Supabase fetch
const emtData: Record<number, {
  name: string
  certification: string
  yearsExperience: number
  eventTypes: string[]
  radiusMiles: number
  available: boolean
  bio: string
}> = {
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

export default async function EMTProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const numericId = parseInt(id)
  const emt = emtData[numericId]

  if (!emt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-xs font-mono text-accent uppercase tracking-widest mb-3">404</div>
          <p className="text-muted-foreground font-mono text-sm mb-6">EMT profile not found.</p>
          <Link
            href="/marketplace"
            className="border border-border px-4 py-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface px-8 py-5 flex items-center gap-4">
        <Link
          href="/marketplace"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Personnel
        </Link>
        <div className="h-4 w-px bg-border" />
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          EMT Profile
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Name + cert */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-3">
            <span className="bg-primary text-primary-foreground font-mono text-xs px-3 py-1 uppercase tracking-wider">
              {emt.certification}
            </span>
            <span className={`font-mono text-xs uppercase tracking-wider ${emt.available ? "text-emerald-500" : "text-muted-foreground"}`}>
              {emt.available ? "Available" : "Unavailable"}
            </span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">{emt.name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border mb-8">
          <div className="bg-background px-8 py-6">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Experience
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-2xl">{emt.yearsExperience}</span>
              <span className="text-sm text-muted-foreground">years</span>
            </div>
          </div>
          <div className="bg-background px-8 py-6">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Service Radius
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-2xl">{emt.radiusMiles}</span>
              <span className="text-sm text-muted-foreground">miles</span>
            </div>
          </div>
          <div className="bg-background px-8 py-6">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Availability
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm">
                {emt.available ? "Available for booking" : "Currently booked"}
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="border border-border mb-8">
          <div className="border-b border-border px-8 py-4">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Background
            </span>
          </div>
          <div className="px-8 py-6">
            <p className="text-foreground/90 leading-relaxed">{emt.bio}</p>
          </div>
        </div>

        {/* Event Types */}
        <div className="border border-border mb-10">
          <div className="border-b border-border px-8 py-4">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Event Type Experience
            </span>
          </div>
          <div className="px-8 py-6 flex flex-wrap gap-2">
            {emt.eventTypes.map((type) => (
              <span
                key={type}
                className="border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground uppercase tracking-wider"
              >
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-4">
          <button
            disabled={!emt.available}
            className={`h-11 px-8 text-sm font-mono uppercase tracking-wider border transition-colors ${
              emt.available
                ? "bg-accent text-white border-accent hover:bg-accent/90"
                : "bg-muted text-muted-foreground border-border cursor-not-allowed"
            }`}
          >
            {emt.available ? "Request This EMT" : "Currently Unavailable"}
          </button>
          <Link
            href="/marketplace"
            className="h-11 px-6 border border-border text-sm font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-foreground transition-colors flex items-center"
          >
            Browse More Personnel
          </Link>
        </div>
      </div>
    </div>
  )
}
