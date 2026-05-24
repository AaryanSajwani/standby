"use client"

import { Search, ChevronDown } from "lucide-react"
import { useState } from "react"

interface SearchHeaderProps {
  resultCount: number
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: string
  onSortChange: (sort: string) => void
}

export function SearchHeader({
  resultCount,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}: SearchHeaderProps) {
  const [sortOpen, setSortOpen] = useState(false)

  const sortOptions = [
    { value: "experience-desc", label: "Experience (High to Low)" },
    { value: "experience-asc", label: "Experience (Low to High)" },
    { value: "name-asc", label: "Name (A-Z)" },
    { value: "name-desc", label: "Name (Z-A)" },
    { value: "availability", label: "Availability" },
  ]

  const currentSort = sortOptions.find((opt) => opt.value === sortBy)

  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center gap-6 p-5">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or certification..."
            className="w-full bg-input border border-border pl-10 pr-4 py-2.5 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {/* Result Count */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-primary tabular-nums font-semibold">
            {resultCount}
          </span>
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            Personnel Available
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-2 border border-border bg-input px-4 py-2.5 hover:border-muted-foreground transition-colors"
          >
            <span className="font-sans text-xs uppercase tracking-wider text-muted-foreground">
              Sort:
            </span>
            <span className="font-sans text-sm text-foreground">{currentSort?.label}</span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${sortOpen ? "rotate-180" : ""}`}
            />
          </button>

          {sortOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setSortOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[200px] border border-border bg-popover">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value)
                      setSortOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2.5 font-sans text-sm transition-colors ${
                      sortBy === option.value
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
