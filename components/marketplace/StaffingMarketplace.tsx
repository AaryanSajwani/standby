"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { EMTCard } from "./EMTCard"
import { FilterSidebar, type FilterState } from "./FilterSidebar"
import { SearchHeader } from "./SearchHeader"
import { Activity } from "lucide-react"

const emtData = [
  { id: 1,  name: "Marcus Chen",       certification: "EMT-P" as const, yearsExperience: 8,  eventTypes: ["Concerts", "Sports", "Festivals"],               radiusMiles: 50,  available: true  },
  { id: 2,  name: "Sarah Mitchell",    certification: "EMT-B" as const, yearsExperience: 4,  eventTypes: ["Corporate", "Private Events"],                   radiusMiles: 25,  available: true  },
  { id: 3,  name: "David Rodriguez",   certification: "EMT-P" as const, yearsExperience: 12, eventTypes: ["Film & TV", "Concerts", "Sports"],               radiusMiles: 75,  available: false },
  { id: 4,  name: "Emily Thompson",    certification: "First Responder" as const, yearsExperience: 2,  eventTypes: ["Corporate", "Festivals"],             radiusMiles: 30,  available: true  },
  { id: 5,  name: "James Wilson",      certification: "EMT-B" as const, yearsExperience: 6,  eventTypes: ["Sports", "Concerts"],                           radiusMiles: 40,  available: true  },
  { id: 6,  name: "Lisa Nakamura",     certification: "EMT-P" as const, yearsExperience: 10, eventTypes: ["Film & TV", "Private Events", "Corporate"],      radiusMiles: 60,  available: true  },
  { id: 7,  name: "Robert Garcia",     certification: "EMT-B" as const, yearsExperience: 3,  eventTypes: ["Festivals", "Concerts"],                        radiusMiles: 35,  available: false },
  { id: 8,  name: "Amanda Foster",     certification: "EMT-B" as const, yearsExperience: 5,  eventTypes: ["Sports", "Corporate"],                          radiusMiles: 45,  available: true  },
  { id: 9,  name: "Michael Park",      certification: "EMT-P" as const, yearsExperience: 15, eventTypes: ["Concerts", "Festivals", "Film & TV", "Sports"],  radiusMiles: 100, available: true  },
  { id: 10, name: "Jennifer Adams",    certification: "First Responder" as const, yearsExperience: 1,  eventTypes: ["Private Events"],                    radiusMiles: 20,  available: true  },
  { id: 11, name: "Christopher Lee",   certification: "EMT-B" as const, yearsExperience: 7,  eventTypes: ["Sports", "Festivals", "Concerts"],              radiusMiles: 55,  available: false },
  { id: 12, name: "Rachel Kim",        certification: "EMT-P" as const, yearsExperience: 9,  eventTypes: ["Film & TV", "Corporate"],                       radiusMiles: 70,  available: true  },
  { id: 13, name: "Daniel Brown",      certification: "EMT-B" as const, yearsExperience: 4,  eventTypes: ["Concerts", "Private Events"],                   radiusMiles: 30,  available: true  },
  { id: 14, name: "Nicole Martinez",   certification: "EMT-B" as const, yearsExperience: 6,  eventTypes: ["Festivals", "Sports", "Corporate"],             radiusMiles: 45,  available: true  },
  { id: 15, name: "Kevin O'Brien",     certification: "EMT-P" as const, yearsExperience: 11, eventTypes: ["Sports", "Concerts", "Film & TV"],              radiusMiles: 65,  available: true  },
]

const DEFAULT_FILTERS: FilterState = {
  location: "",
  radius: 25,
  certifications: { "EMT-B": false, "EMT-P": false, "First Responder": false },
  availability: { "available-now": false, "this-weekend": false, "this-month": false },
  eventTypes: { concerts: false, sports: false, festivals: false, corporate: false, "film-tv": false, private: false },
  minYearsExperience: 0,
}

export default function StaffingMarketplace() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("experience-desc")

  const filteredAndSortedEMTs = useMemo(() => {
    let result = [...emtData]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (emt) =>
          emt.name.toLowerCase().includes(query) ||
          emt.certification.toLowerCase().includes(query)
      )
    }

    const activeCertifications = Object.entries(filters.certifications)
      .filter(([, active]) => active)
      .map(([cert]) => cert)
    if (activeCertifications.length > 0) {
      result = result.filter((emt) => activeCertifications.includes(emt.certification))
    }

    if (filters.availability["available-now"]) {
      result = result.filter((emt) => emt.available)
    }

    if (filters.minYearsExperience > 0) {
      result = result.filter((emt) => emt.yearsExperience >= filters.minYearsExperience)
    }

    result = result.filter((emt) => emt.radiusMiles <= filters.radius || filters.radius >= 100)

    switch (sortBy) {
      case "experience-desc": result.sort((a, b) => b.yearsExperience - a.yearsExperience); break
      case "experience-asc":  result.sort((a, b) => a.yearsExperience - b.yearsExperience); break
      case "name-asc":        result.sort((a, b) => a.name.localeCompare(b.name)); break
      case "name-desc":       result.sort((a, b) => b.name.localeCompare(a.name)); break
      case "availability":    result.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0)); break
    }

    return result
  }, [filters, searchQuery, sortBy])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-border bg-sidebar flex items-center px-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-sans font-bold text-lg tracking-tight text-foreground">
            STANDBY
          </span>
        </div>
        <nav className="ml-10 flex items-center gap-6">
          <Link href="/" className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Link href="/marketplace" className="font-sans text-sm text-primary font-semibold">
            Personnel
          </Link>
          <Link href="/events" className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors">
            Events
          </Link>
          <Link href="/schedule" className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors">
            Schedule
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/assess"
            className="bg-primary px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wide text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Post Event
          </Link>
        </div>
      </header>

      <div className="flex">
        <FilterSidebar filters={filters} onFiltersChange={setFilters} />

        <main className="flex-1 flex flex-col min-h-[calc(100vh-3.5rem)]">
          <SearchHeader
            resultCount={filteredAndSortedEMTs.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          <div className="flex-1 p-5">
            {filteredAndSortedEMTs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 border-l border-t border-border">
                {filteredAndSortedEMTs.map((emt) => (
                  <EMTCard
                    key={emt.id}
                    id={emt.id}
                    name={emt.name}
                    certification={emt.certification}
                    yearsExperience={emt.yearsExperience}
                    eventTypes={emt.eventTypes}
                    radiusMiles={emt.radiusMiles}
                    available={emt.available}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
                  No personnel match your filters
                </p>
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="mt-4 border border-primary px-4 py-2 text-xs font-sans font-semibold text-primary uppercase tracking-wide hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
