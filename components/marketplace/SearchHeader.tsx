"use client"

import { Search, Grid3X3, List } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "rating-desc", label: "Highest Rated" },
  { value: "experience-desc", label: "Most Experienced" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "reviews-desc", label: "Most Reviews" },
]

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  return (
    <div className="bg-card border-b border-border">
      <div className="flex items-center gap-4 p-5">
        {/* Search */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search EMTs by name, certification, or specialty..."
            className="pl-9 rounded-full"
          />
        </div>

        {/* Result count */}
        <div className="flex items-center gap-2 px-4">
          <span className="text-2xl font-bold text-foreground">{resultCount}</span>
          <span className="text-sm text-muted-foreground">professionals available</span>
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-none ${viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-none ${viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by…" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
