"use client"

import { useState, useMemo } from "react"
import { Activity, Shield, Clock, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EMTCard, type EMTCardProps } from "@/components/ui/emt-card"
import { FilterSidebar, DEFAULT_FILTERS, type FilterState } from "@/components/marketplace/FilterSidebar"
import { SearchHeader } from "@/components/marketplace/SearchHeader"

// Mock data — used when no verified EMTs exist in the DB yet
const MOCK_EMT_DATA: EMTCardProps[] = [
  { id: 1,  name: "Marcus Chen",      certification: "EMT-P",           yearsExperience: 8,  eventTypes: ["Concerts", "Sports", "Festivals"],               radiusMiles: 50,  available: true,  rating: 4.9,  reviewCount: 127, hourlyRate: 85,  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face", completedEvents: 342 },
  { id: 2,  name: "Sarah Mitchell",   certification: "EMT-B",           yearsExperience: 4,  eventTypes: ["Corporate", "Private Events"],                   radiusMiles: 25,  available: true,  rating: 4.8,  reviewCount: 89,  hourlyRate: 55,  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face", completedEvents: 156 },
  { id: 3,  name: "David Rodriguez",  certification: "EMT-P",           yearsExperience: 12, eventTypes: ["Film & TV", "Concerts", "Sports"],               radiusMiles: 75,  available: false, rating: 5.0,  reviewCount: 203, hourlyRate: 120, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face", completedEvents: 518 },
  { id: 4,  name: "Emily Thompson",   certification: "First Responder", yearsExperience: 2,  eventTypes: ["Corporate", "Festivals"],                        radiusMiles: 30,  available: true,  rating: 4.7,  reviewCount: 34,  hourlyRate: 40,  avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face", completedEvents: 67  },
  { id: 5,  name: "James Wilson",     certification: "EMT-B",           yearsExperience: 6,  eventTypes: ["Sports", "Concerts"],                            radiusMiles: 40,  available: true,  rating: 4.9,  reviewCount: 156, hourlyRate: 60,  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face", completedEvents: 234 },
  { id: 6,  name: "Lisa Nakamura",    certification: "EMT-P",           yearsExperience: 10, eventTypes: ["Film & TV", "Private Events", "Corporate"],      radiusMiles: 60,  available: true,  rating: 4.95, reviewCount: 178, hourlyRate: 95,  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face", completedEvents: 412 },
  { id: 7,  name: "Robert Garcia",    certification: "EMT-B",           yearsExperience: 3,  eventTypes: ["Festivals", "Concerts"],                         radiusMiles: 35,  available: false, rating: 4.6,  reviewCount: 45,  hourlyRate: 50,  avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face", completedEvents: 89  },
  { id: 8,  name: "Amanda Foster",    certification: "EMT-B",           yearsExperience: 5,  eventTypes: ["Sports", "Corporate"],                           radiusMiles: 45,  available: true,  rating: 4.8,  reviewCount: 112, hourlyRate: 58,  avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face", completedEvents: 198 },
  { id: 9,  name: "Michael Park",     certification: "EMT-P",           yearsExperience: 15, eventTypes: ["Concerts", "Festivals", "Film & TV", "Sports"],  radiusMiles: 100, available: true,  rating: 5.0,  reviewCount: 287, hourlyRate: 135, avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face", completedEvents: 723 },
  { id: 10, name: "Jennifer Adams",   certification: "First Responder", yearsExperience: 1,  eventTypes: ["Private Events"],                               radiusMiles: 20,  available: true,  rating: 4.5,  reviewCount: 18,  hourlyRate: 35,  avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=face", completedEvents: 32  },
  { id: 11, name: "Christopher Lee",  certification: "EMT-B",           yearsExperience: 7,  eventTypes: ["Sports", "Festivals", "Concerts"],               radiusMiles: 55,  available: false, rating: 4.85, reviewCount: 134, hourlyRate: 65,  avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&crop=face", completedEvents: 267 },
  { id: 12, name: "Rachel Kim",       certification: "EMT-P",           yearsExperience: 9,  eventTypes: ["Film & TV", "Corporate"],                        radiusMiles: 70,  available: true,  rating: 4.9,  reviewCount: 165, hourlyRate: 90,  avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face", completedEvents: 378 },
  { id: 13, name: "Daniel Brown",     certification: "EMT-B",           yearsExperience: 4,  eventTypes: ["Concerts", "Private Events"],                    radiusMiles: 30,  available: true,  rating: 4.7,  reviewCount: 67,  hourlyRate: 52,  avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=face", completedEvents: 124 },
  { id: 14, name: "Nicole Martinez",  certification: "EMT-B",           yearsExperience: 6,  eventTypes: ["Festivals", "Sports", "Corporate"],              radiusMiles: 45,  available: true,  rating: 4.8,  reviewCount: 98,  hourlyRate: 58,  avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=face", completedEvents: 189 },
  { id: 15, name: "Kevin O'Brien",    certification: "EMT-P",           yearsExperience: 11, eventTypes: ["Sports", "Concerts", "Film & TV"],               radiusMiles: 65,  available: true,  rating: 4.95, reviewCount: 198, hourlyRate: 105, avatar: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=200&h=200&fit=crop&crop=face", completedEvents: 456 },
]

interface StaffingMarketplaceProps {
  /** Verified EMTs fetched server-side. Empty array = fall back to mock data. */
  verifiedEmts?: EMTCardProps[]
}

export default function StaffingMarketplace({ verifiedEmts = [] }: StaffingMarketplaceProps) {
  const isMockFallback = verifiedEmts.length === 0
  const baseData = isMockFallback ? MOCK_EMT_DATA : verifiedEmts

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
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

    if (filters.availability["available-now"]) list = list.filter((e) => e.available)
    if (filters.minYearsExperience > 0) list = list.filter((e) => (e.yearsExperience ?? 0) >= filters.minYearsExperience)

    list = list.filter((e) => e.radiusMiles <= filters.radius || filters.radius >= 100)

    switch (sortBy) {
      case "recommended":
        list.sort((a, b) => (b.rating ?? 0) * (b.reviewCount ?? 0) - (a.rating ?? 0) * (a.reviewCount ?? 0))
        break
      case "rating-desc":     list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break
      case "experience-desc": list.sort((a, b) => (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0)); break
      case "price-asc":       list.sort((a, b) => a.hourlyRate - b.hourlyRate); break
      case "price-desc":      list.sort((a, b) => b.hourlyRate - a.hourlyRate); break
      case "reviews-desc":    list.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0)); break
    }

    return list
  }, [filters, searchQuery, sortBy, baseData])

  return (
    <div className="flex flex-col flex-1">
      {/* Hero */}
      <div className="bg-card border-b border-border py-12">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h1 className="text-4xl font-bold text-foreground mb-4">Find Certified EMT Professionals</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Connect with verified, experienced emergency medical technicians for your events.
            Trusted by 2,000+ event organizers nationwide.
          </p>
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm text-foreground">Verified Credentials</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-sm text-foreground">24/7 Availability</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-sm text-foreground">Top Rated Pros</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body: sidebar + main */}
      <div className="flex flex-1">
        <FilterSidebar filters={filters} onFiltersChange={setFilters} />

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
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No EMTs Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your filters to see more results
                </p>
                <Button onClick={() => setFilters(DEFAULT_FILTERS)}>Clear All Filters</Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
