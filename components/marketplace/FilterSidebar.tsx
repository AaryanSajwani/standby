"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

interface FilterSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-4 text-left"
      >
        <span className="font-sans text-xs font-semibold uppercase tracking-wider text-foreground">
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </div>
  )
}

interface CheckboxFilterProps {
  label: string
  count?: number
  checked: boolean
  onChange: (checked: boolean) => void
}

function CheckboxFilter({ label, count, checked, onChange }: CheckboxFilterProps) {
  return (
    <label className="flex items-center gap-3 py-1.5 cursor-pointer group">
      <div
        className={`h-4 w-4 border flex items-center justify-center transition-colors ${
          checked ? "border-primary bg-primary" : "border-border bg-transparent"
        }`}
      >
        {checked && (
          <svg className="h-2.5 w-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 12 12">
            <path d="M10.28 2.28L4 8.56 1.72 6.28a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l7-7a.75.75 0 10-1.06-1.06z" />
          </svg>
        )}
      </div>
      <span className="font-sans text-sm text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
      {count !== undefined && (
        <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
          {count}
        </span>
      )}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  )
}

interface SliderFilterProps {
  label: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (value: number) => void
}

function SliderFilter({ label, value, min, max, unit, onChange }: SliderFilterProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-sans text-sm text-muted-foreground">{label}</span>
        <span className="font-mono text-sm text-foreground tabular-nums">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-border appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
      />
      <div className="flex justify-between text-xs font-mono text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

export interface FilterState {
  location: string
  radius: number
  certifications: {
    "EMT-B": boolean
    "EMT-P": boolean
    "First Responder": boolean
  }
  availability: {
    "available-now": boolean
    "this-weekend": boolean
    "this-month": boolean
  }
  eventTypes: {
    "concerts": boolean
    "sports": boolean
    "festivals": boolean
    "corporate": boolean
    "film-tv": boolean
    "private": boolean
  }
  minYearsExperience: number
}

interface FilterSidebarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

export function FilterSidebar({ filters, onFiltersChange }: FilterSidebarProps) {
  const updateCertification = (key: keyof FilterState["certifications"], value: boolean) => {
    onFiltersChange({
      ...filters,
      certifications: { ...filters.certifications, [key]: value },
    })
  }

  const updateAvailability = (key: keyof FilterState["availability"], value: boolean) => {
    onFiltersChange({
      ...filters,
      availability: { ...filters.availability, [key]: value },
    })
  }

  const updateEventType = (key: keyof FilterState["eventTypes"], value: boolean) => {
    onFiltersChange({
      ...filters,
      eventTypes: { ...filters.eventTypes, [key]: value },
    })
  }

  return (
    <aside className="w-72 shrink-0 border-r border-border bg-sidebar">
      <div className="p-5 border-b border-border">
        <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-foreground">
          Filters
        </h2>
      </div>

      <div className="p-5">
        {/* Location */}
        <FilterSection title="Location">
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={filters.location}
              onChange={(e) => onFiltersChange({ ...filters, location: e.target.value })}
              placeholder="City or ZIP code"
              className="w-full bg-input border border-border px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <SliderFilter
              label="Radius"
              value={filters.radius}
              min={5}
              max={100}
              unit="mi"
              onChange={(value) => onFiltersChange({ ...filters, radius: value })}
            />
          </div>
        </FilterSection>

        {/* Certification Level */}
        <FilterSection title="Certification">
          <div className="flex flex-col">
            <CheckboxFilter
              label="EMT-B"
              count={8}
              checked={filters.certifications["EMT-B"]}
              onChange={(checked) => updateCertification("EMT-B", checked)}
            />
            <CheckboxFilter
              label="EMT-P (Paramedic)"
              count={4}
              checked={filters.certifications["EMT-P"]}
              onChange={(checked) => updateCertification("EMT-P", checked)}
            />
            <CheckboxFilter
              label="First Responder"
              count={2}
              checked={filters.certifications["First Responder"]}
              onChange={(checked) => updateCertification("First Responder", checked)}
            />
          </div>
        </FilterSection>

        {/* Availability */}
        <FilterSection title="Availability">
          <div className="flex flex-col">
            <CheckboxFilter
              label="Available Now"
              count={6}
              checked={filters.availability["available-now"]}
              onChange={(checked) => updateAvailability("available-now", checked)}
            />
            <CheckboxFilter
              label="This Weekend"
              count={11}
              checked={filters.availability["this-weekend"]}
              onChange={(checked) => updateAvailability("this-weekend", checked)}
            />
            <CheckboxFilter
              label="This Month"
              count={14}
              checked={filters.availability["this-month"]}
              onChange={(checked) => updateAvailability("this-month", checked)}
            />
          </div>
        </FilterSection>

        {/* Event Type Experience */}
        <FilterSection title="Event Experience">
          <div className="flex flex-col">
            <CheckboxFilter
              label="Concerts"
              count={9}
              checked={filters.eventTypes.concerts}
              onChange={(checked) => updateEventType("concerts", checked)}
            />
            <CheckboxFilter
              label="Sports Events"
              count={7}
              checked={filters.eventTypes.sports}
              onChange={(checked) => updateEventType("sports", checked)}
            />
            <CheckboxFilter
              label="Festivals"
              count={5}
              checked={filters.eventTypes.festivals}
              onChange={(checked) => updateEventType("festivals", checked)}
            />
            <CheckboxFilter
              label="Corporate Events"
              count={8}
              checked={filters.eventTypes.corporate}
              onChange={(checked) => updateEventType("corporate", checked)}
            />
            <CheckboxFilter
              label="Film & TV"
              count={3}
              checked={filters.eventTypes["film-tv"]}
              onChange={(checked) => updateEventType("film-tv", checked)}
            />
            <CheckboxFilter
              label="Private Events"
              count={6}
              checked={filters.eventTypes.private}
              onChange={(checked) => updateEventType("private", checked)}
            />
          </div>
        </FilterSection>

        {/* Minimum Experience */}
        <FilterSection title="Experience">
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

      {/* Reset Button */}
      <div className="p-5 border-t border-border">
        <button
          onClick={() =>
            onFiltersChange({
              location: "",
              radius: 25,
              certifications: { "EMT-B": false, "EMT-P": false, "First Responder": false },
              availability: { "available-now": false, "this-weekend": false, "this-month": false },
              eventTypes: {
                concerts: false,
                sports: false,
                festivals: false,
                corporate: false,
                "film-tv": false,
                private: false,
              },
              minYearsExperience: 0,
            })
          }
          className="w-full py-2.5 border border-border text-xs font-sans font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          Reset Filters
        </button>
      </div>
    </aside>
  )
}
