"use client"

import { Search } from "lucide-react"
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
  { value: "experience-desc", label: "Most Experienced" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
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
  return (
    <div className="bg-card border-b border-border">
      <div className="flex flex-wrap items-center gap-3 md:gap-4 p-4 md:p-5">
        {/* Search — full row on phones, inline from sm up */}
        <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, certification, or specialty…"
            className="pl-9 rounded-none"
          />
        </div>

        {/* Result count */}
        <div className="flex items-center gap-2 px-1 sm:px-4">
          <span className="font-mono text-2xl font-bold tabular-nums text-foreground">{resultCount}</span>
          <span className="text-sm text-muted-foreground">available</span>
        </div>

        {/* Sort */}
        {/* Base UI Select emits `string | null` — null-guard before forwarding */}
        <Select value={sortBy} onValueChange={(v) => { if (v) onSortChange(v) }}>
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
