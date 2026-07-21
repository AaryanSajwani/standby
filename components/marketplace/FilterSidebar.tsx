"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"

// ── Types ────────────────────────────────────────────────────────────────────

export interface FilterState {
  radius: number
  certifications: { "EMT-B": boolean; "EMR": boolean }
  availableNow: boolean
  eventTypes: {
    Concerts: boolean
    Sports: boolean
    Festivals: boolean
    Corporate: boolean
    "Film & TV": boolean
    "Private Events": boolean
  }
  minYearsExperience: number
}

export const DEFAULT_FILTERS: FilterState = {
  radius: 50,
  certifications: { "EMT-B": false, "EMR": false },
  availableNow: false,
  eventTypes: { Concerts: false, Sports: false, Festivals: false, Corporate: false, "Film & TV": false, "Private Events": false },
  minYearsExperience: 0,
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left group"
      >
        <span className="font-semibold text-sm text-foreground">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  )
}

function CheckboxFilter({
  id,
  label,
  count,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  count?: number
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label
        htmlFor={id}
        className="flex-1 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
      >
        {label}
      </Label>
      {count !== undefined && (
        <Badge variant="secondary" className="font-mono text-[10px] tabular-nums px-2 py-0.5">
          {count}
        </Badge>
      )}
    </div>
  )
}

function SliderFilter({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-mono text-sm tabular-nums font-semibold text-foreground">
          {value} {unit}
        </span>
      </div>
      {/* Base UI may deliver a scalar (not an array) for single-thumb sliders — never destructure */}
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(val) => onChange(Array.isArray(val) ? val[0] : val)}
      />
      <div className="flex justify-between font-mono text-xs tabular-nums text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface FilterSidebarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  /** Live option counts computed from the current personnel set. */
  counts?: {
    certifications: Record<string, number>
    eventTypes: Record<string, number>
    availableNow: number
  }
}

export function FilterSidebar({ filters, onFiltersChange, counts }: FilterSidebarProps) {
  const updateCertification = (key: keyof FilterState["certifications"], value: boolean) =>
    onFiltersChange({ ...filters, certifications: { ...filters.certifications, [key]: value } })

  const updateEventType = (key: keyof FilterState["eventTypes"], value: boolean) =>
    onFiltersChange({ ...filters, eventTypes: { ...filters.eventTypes, [key]: value } })

  const activeFilterCount = [
    ...Object.values(filters.certifications),
    ...Object.values(filters.eventTypes),
    filters.availableNow,
    filters.minYearsExperience > 0,
    filters.radius !== 50,
  ].filter(Boolean).length

  const eventTypeKeys = Object.keys(filters.eventTypes) as (keyof FilterState["eventTypes"])[]

  return (
    <aside className="w-72 shrink-0 bg-sidebar border-r border-border">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-foreground" />
          <h2 className="font-semibold text-foreground">Filters</h2>
        </div>
        {activeFilterCount > 0 && (
          <Badge className="font-mono text-[10px] tabular-nums font-semibold">{activeFilterCount}</Badge>
        )}
      </div>

      <div className="p-5 overflow-y-auto max-h-[calc(100vh-180px)]">
        <FilterSection title="Service radius">
          <SliderFilter
            label="Within"
            value={filters.radius}
            min={5}
            max={100}
            unit="mi"
            onChange={(value) => onFiltersChange({ ...filters, radius: value })}
          />
        </FilterSection>

        <FilterSection title="Certification level">
          <CheckboxFilter id="cert-emtb" label="EMT-Basic (EMT-B)" count={counts?.certifications["EMT-B"]} checked={filters.certifications["EMT-B"]} onCheckedChange={(v) => updateCertification("EMT-B", v)} />
          <CheckboxFilter id="cert-emr" label="EMR (First Responder)" count={counts?.certifications["EMR"]} checked={filters.certifications["EMR"]} onCheckedChange={(v) => updateCertification("EMR", v)} />
        </FilterSection>

        <FilterSection title="Availability">
          <CheckboxFilter id="avail-now" label="Available now" count={counts?.availableNow} checked={filters.availableNow} onCheckedChange={(v) => onFiltersChange({ ...filters, availableNow: v })} />
        </FilterSection>

        <FilterSection title="Event experience">
          {eventTypeKeys.map((key) => (
            <CheckboxFilter
              key={key}
              id={`evt-${key}`}
              label={key}
              count={counts?.eventTypes[key]}
              checked={filters.eventTypes[key]}
              onCheckedChange={(v) => updateEventType(key, v)}
            />
          ))}
        </FilterSection>

        <FilterSection title="Experience level">
          <SliderFilter
            label="Minimum years"
            value={filters.minYearsExperience}
            min={0}
            max={15}
            unit="yrs"
            onChange={(value) => onFiltersChange({ ...filters, minYearsExperience: value })}
          />
        </FilterSection>
      </div>

      <div className="p-5 border-t border-border">
        <Button variant="outline" className="w-full" onClick={() => onFiltersChange(DEFAULT_FILTERS)}>
          Clear all filters
        </Button>
      </div>
    </aside>
  )
}
