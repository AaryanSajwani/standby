"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"

// ── Types ────────────────────────────────────────────────────────────────────

export interface FilterState {
  location: string
  radius: number
  certifications: { "EMT-B": boolean; "EMT-P": boolean; "First Responder": boolean }
  availability: { "available-now": boolean; "this-weekend": boolean; "this-month": boolean }
  eventTypes: {
    concerts: boolean
    sports: boolean
    festivals: boolean
    corporate: boolean
    "film-tv": boolean
    private: boolean
  }
  minYearsExperience: number
  priceRange: [number, number]
}

export const DEFAULT_FILTERS: FilterState = {
  location: "",
  radius: 50,
  certifications: { "EMT-B": false, "EMT-P": false, "First Responder": false },
  availability: { "available-now": false, "this-weekend": false, "this-month": false },
  eventTypes: { concerts: false, sports: false, festivals: false, corporate: false, "film-tv": false, private: false },
  minYearsExperience: 0,
  priceRange: [25, 150],
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
        <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">
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
        <span className="text-sm font-semibold text-foreground">
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
      <div className="flex justify-between text-xs text-muted-foreground">
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
}

export function FilterSidebar({ filters, onFiltersChange }: FilterSidebarProps) {
  const updateCertification = (key: keyof FilterState["certifications"], value: boolean) =>
    onFiltersChange({ ...filters, certifications: { ...filters.certifications, [key]: value } })

  const updateAvailability = (key: keyof FilterState["availability"], value: boolean) =>
    onFiltersChange({ ...filters, availability: { ...filters.availability, [key]: value } })

  const updateEventType = (key: keyof FilterState["eventTypes"], value: boolean) =>
    onFiltersChange({ ...filters, eventTypes: { ...filters.eventTypes, [key]: value } })

  const activeFilterCount = [
    ...Object.values(filters.certifications),
    ...Object.values(filters.availability),
    ...Object.values(filters.eventTypes),
    filters.minYearsExperience > 0,
    filters.radius !== 50,
  ].filter(Boolean).length

  return (
    <aside className="w-72 shrink-0 bg-sidebar border-r border-border">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-foreground" />
          <h2 className="font-semibold text-foreground">Filters</h2>
        </div>
        {activeFilterCount > 0 && (
          <Badge className="text-xs font-semibold">{activeFilterCount}</Badge>
        )}
      </div>

      <div className="p-5 overflow-y-auto max-h-[calc(100vh-180px)]">
        <FilterSection title="Location">
          <div className="flex flex-col gap-4">
            <Input
              value={filters.location}
              onChange={(e) => onFiltersChange({ ...filters, location: e.target.value })}
              placeholder="City or ZIP code"
            />
            <SliderFilter
              label="Service Radius"
              value={filters.radius}
              min={5}
              max={100}
              unit="mi"
              onChange={(value) => onFiltersChange({ ...filters, radius: value })}
            />
          </div>
        </FilterSection>

        <FilterSection title="Certification Level">
          <CheckboxFilter id="cert-emtb" label="EMT-Basic (EMT-B)" count={8} checked={filters.certifications["EMT-B"]} onCheckedChange={(v) => updateCertification("EMT-B", v)} />
          <CheckboxFilter id="cert-emtp" label="Paramedic (EMT-P)" count={4} checked={filters.certifications["EMT-P"]} onCheckedChange={(v) => updateCertification("EMT-P", v)} />
          <CheckboxFilter id="cert-fr" label="First Responder" count={2} checked={filters.certifications["First Responder"]} onCheckedChange={(v) => updateCertification("First Responder", v)} />
        </FilterSection>

        <FilterSection title="Availability">
          <CheckboxFilter id="avail-now" label="Available Now" count={6} checked={filters.availability["available-now"]} onCheckedChange={(v) => updateAvailability("available-now", v)} />
          <CheckboxFilter id="avail-weekend" label="This Weekend" count={11} checked={filters.availability["this-weekend"]} onCheckedChange={(v) => updateAvailability("this-weekend", v)} />
          <CheckboxFilter id="avail-month" label="This Month" count={14} checked={filters.availability["this-month"]} onCheckedChange={(v) => updateAvailability("this-month", v)} />
        </FilterSection>

        <FilterSection title="Event Experience">
          <CheckboxFilter id="evt-concerts" label="Concerts & Music" count={9} checked={filters.eventTypes.concerts} onCheckedChange={(v) => updateEventType("concerts", v)} />
          <CheckboxFilter id="evt-sports" label="Sports Events" count={7} checked={filters.eventTypes.sports} onCheckedChange={(v) => updateEventType("sports", v)} />
          <CheckboxFilter id="evt-festivals" label="Festivals" count={5} checked={filters.eventTypes.festivals} onCheckedChange={(v) => updateEventType("festivals", v)} />
          <CheckboxFilter id="evt-corporate" label="Corporate Events" count={8} checked={filters.eventTypes.corporate} onCheckedChange={(v) => updateEventType("corporate", v)} />
          <CheckboxFilter id="evt-film" label="Film & TV Production" count={3} checked={filters.eventTypes["film-tv"]} onCheckedChange={(v) => updateEventType("film-tv", v)} />
          <CheckboxFilter id="evt-private" label="Private Events" count={6} checked={filters.eventTypes.private} onCheckedChange={(v) => updateEventType("private", v)} />
        </FilterSection>

        <FilterSection title="Experience Level">
          <SliderFilter
            label="Minimum Years"
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
          Clear All Filters
        </Button>
      </div>
    </aside>
  )
}
