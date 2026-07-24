"use client"

import { useState, useMemo } from "react"
import { Activity, ShieldCheck, DollarSign, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EMTCard, type EMTCardProps } from "@/components/ui/emt-card"
import { FilterSidebar, DEFAULT_FILTERS, type FilterState } from "@/components/marketplace/FilterSidebar"
import { SearchHeader } from "@/components/marketplace/SearchHeader"
import { enumerateDays } from "@/lib/availability"

// Sample listings — shown only when no verified EMTs exist in the DB yet, behind
// an explicit "Sample profiles" banner. No fabricated trust signals (no stock
// photos, ratings, review counts, or completed-event tallies). See §1 / §5.
const MOCK_EMT_DATA: EMTCardProps[] = [
  { id: 1,  name: "Marcus Chen",      certification: "EMT-B", yearsExperience: 8,  eventTypes: ["Concerts", "Sports", "Festivals"],               radiusMiles: 50,  available: true,  hourlyRate: 32 },
  { id: 2,  name: "Sarah Mitchell",   certification: "EMT-B", yearsExperience: 4,  eventTypes: ["Corporate", "Private Events"],                   radiusMiles: 25,  available: true,  hourlyRate: 24 },
  { id: 3,  name: "David Rodriguez",  certification: "EMT-B", yearsExperience: 12, eventTypes: ["Film & TV", "Concerts", "Sports"],               radiusMiles: 75,  available: false, hourlyRate: 38 },
  { id: 4,  name: "Emily Thompson",   certification: "EMR",   yearsExperience: 2,  eventTypes: ["Corporate", "Festivals"],                        radiusMiles: 30,  available: true,  hourlyRate: 22 },
  { id: 5,  name: "James Wilson",     certification: "EMT-B", yearsExperience: 6,  eventTypes: ["Sports", "Concerts"],                            radiusMiles: 40,  available: true,  hourlyRate: 28 },
  { id: 6,  name: "Lisa Nakamura",    certification: "EMT-B", yearsExperience: 10, eventTypes: ["Film & TV", "Private Events", "Corporate"],      radiusMiles: 60,  available: true,  hourlyRate: 34 },
  { id: 7,  name: "Robert Garcia",    certification: "EMR",   yearsExperience: 3,  eventTypes: ["Festivals", "Concerts"],                         radiusMiles: 35,  available: false, hourlyRate: 20 },
  { id: 8,  name: "Amanda Foster",    certification: "EMT-B", yearsExperience: 5,  eventTypes: ["Sports", "Corporate"],                           radiusMiles: 45,  available: true,  hourlyRate: 26 },
  { id: 9,  name: "Michael Park",     certification: "EMT-B", yearsExperience: 15, eventTypes: ["Concerts", "Festivals", "Film & TV", "Sports"],  radiusMiles: 100, available: true,  hourlyRate: 40 },
]

interface StaffingMarketplaceProps {
  /** Verified EMTs fetched server-side. Empty array = fall back to mock data. */
  verifiedEmts?: EMTCardProps[]
  /** Cert levels to pre-check in the filter sidebar (from ?cert= on /personnel). */
  initialCertLevels?: string[]
  /** emt_id → upcoming available dates (YYYY-MM-DD), for the date-range filter. */
  availabilityByEmt?: Record<string, string[]>
}

export default function StaffingMarketplace({
  verifiedEmts = [],
  initialCertLevels = [],
  availabilityByEmt = {},
}: StaffingMarketplaceProps) {
  const isMockFallback = verifiedEmts.length === 0
  const baseData = isMockFallback ? MOCK_EMT_DATA : verifiedEmts

  const [filters, setFilters] = useState<FilterState>(() => {
    if (initialCertLevels.length === 0) return DEFAULT_FILTERS
    const certifications = { ...DEFAULT_FILTERS.certifications }
    for (const cert of initialCertLevels) {
      if (cert in certifications) certifications[cert as keyof typeof certifications] = true
    }
    return { ...DEFAULT_FILTERS, certifications }
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("recommended")

  const results = useMemo(() => {
    let list = [...baseData]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.certification.toLowerCase().includes(q) ||
          e.eventTypes.some((t) => t.toLowerCase().includes(q))
      )
    }

    const activeCerts = Object.entries(filters.certifications).filter(([, v]) => v).map(([k]) => k)
    if (activeCerts.length > 0) list = list.filter((e) => activeCerts.includes(e.certification))

    const activeEventTypes = Object.entries(filters.eventTypes).filter(([, v]) => v).map(([k]) => k)
    if (activeEventTypes.length > 0) list = list.filter((e) => e.eventTypes.some((t) => activeEventTypes.includes(t)))

    if (filters.availableNow) list = list.filter((e) => e.available)

    // Date-range availability: keep personnel available on EVERY day of the
    // range (an organizer needs full-event coverage, so any-overlap would
    // surface medics who can only work part of it). Sample/mock profiles have
    // no availability rows and drop out — no fabricated availability (§1).
    if (filters.availabilityRange?.start && filters.availabilityRange.end) {
      const rangeDays = enumerateDays(filters.availabilityRange.start, filters.availabilityRange.end)
      list = list.filter((e) => {
        const days = availabilityByEmt[String(e.id)]
        if (!days || days.length === 0) return false
        const daySet = new Set(days)
        return rangeDays.every((d) => daySet.has(d))
      })
    }
    if (filters.minYearsExperience > 0) list = list.filter((e) => (e.yearsExperience ?? 0) >= filters.minYearsExperience)

    list = list.filter((e) => e.radiusMiles <= filters.radius || filters.radius >= 100)

    switch (sortBy) {
      case "recommended":
        // No ratings yet — surface available personnel first, most experienced within that
        list.sort((a, b) =>
          Number(b.available) - Number(a.available) ||
          (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0)
        )
        break
      case "experience-desc": list.sort((a, b) => (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0)); break
      case "price-asc":       list.sort((a, b) => a.hourlyRate - b.hourlyRate); break
      case "price-desc":      list.sort((a, b) => b.hourlyRate - a.hourlyRate); break
    }

    return list
  }, [filters, searchQuery, sortBy, baseData, availabilityByEmt])

  // Live option counts from the current personnel set — real numbers, not hardcoded
  const counts = useMemo(() => {
    const certifications: Record<string, number> = {}
    const eventTypes: Record<string, number> = {}
    let availableNow = 0
    for (const e of baseData) {
      certifications[e.certification] = (certifications[e.certification] ?? 0) + 1
      if (e.available) availableNow += 1
      for (const t of e.eventTypes) eventTypes[t] = (eventTypes[t] ?? 0) + 1
    }
    return { certifications, eventTypes, availableNow }
  }, [baseData])

  return (
    <div className="flex flex-col flex-1">
      {/* Hero */}
      <div className="bg-card border-b border-border py-12">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h1 className="text-4xl font-bold text-foreground mb-4">Find certified EMT professionals</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Connect with license-verified emergency medical technicians for your event.
            Every profile is checked before it goes live.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-sm text-foreground">License-verified</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-sm text-foreground">Transparent posted rates</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-sm text-foreground">Request coverage in minutes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body: sidebar + main */}
      <div className="flex flex-1">
        <FilterSidebar filters={filters} onFiltersChange={setFilters} counts={counts} />

        <main className="flex-1 flex flex-col min-h-0">
          <SearchHeader
            resultCount={results.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          <div className="flex-1 p-6 bg-background">
            {/* Sample profiles banner — shown only when falling back to mock data */}
            {isMockFallback && (
              <div className="border border-border bg-surface px-4 py-3 flex items-center gap-3 mb-6">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">
                  Sample profiles
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="font-mono text-xs text-muted-foreground shrink-0">
                  No verified EMTs yet — these are example listings
                </span>
              </div>
            )}

            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                {results.map((emt) => (
                  <EMTCard key={emt.id} {...emt} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-14 h-14 border border-border bg-surface flex items-center justify-center mb-4">
                  <Activity className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No personnel match these filters</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  No EMTs fit this combination yet. Widen the service radius or clear a filter —
                  we&apos;re actively onboarding personnel in new regions.
                </p>
                <Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear all filters</Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
