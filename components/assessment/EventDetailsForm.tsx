"use client"

import { ChevronDown } from "lucide-react"

interface FormData {
  eventName: string
  eventType: string
  expectedAttendance: string
  eventDate: string
}

interface EventDetailsFormProps {
  formData: FormData
  onChange: (data: Partial<FormData>) => void
  onNext: () => void
}

const EVENT_TYPES = [
  { value: "", label: "Select event type" },
  { value: "concert", label: "Concert / Live Music" },
  { value: "festival", label: "Festival (Multi-day)" },
  { value: "sporting-event", label: "Sporting Event" },
  { value: "marathon", label: "Marathon / Running Event" },
  { value: "corporate", label: "Corporate Event" },
  { value: "wedding", label: "Wedding / Private Event" },
  { value: "political-rally", label: "Political Rally" },
  { value: "religious-gathering", label: "Religious Gathering" },
  { value: "trade-show", label: "Trade Show / Exhibition" },
  { value: "other", label: "Other" }
]

export function EventDetailsForm({ formData, onChange, onNext }: EventDetailsFormProps) {
  const isValid = formData.eventName && formData.eventType && formData.expectedAttendance && formData.eventDate

  return (
    <div className="h-full flex">
      {/* Vertical accent line - Signal Red */}
      <div className="w-0.5 bg-accent-signal flex-shrink-0" />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-10 py-8">
          <h2 className="text-3xl font-semibold tracking-tight">Event Details</h2>
          <p className="text-sm text-muted-foreground mt-3">
            Basic information about the event requiring medical coverage
          </p>
        </div>

        {/* Form Fields */}
        <div className="flex-1 p-10 overflow-auto">
          <div className="grid gap-10">
            {/* Event Name */}
            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Event Name <span className="text-risk-high">*</span>
              </label>
              <input
                type="text"
                value={formData.eventName}
                onChange={(e) => onChange({ eventName: e.target.value })}
                placeholder="e.g., Summer Music Festival 2024"
                className="w-full h-14 px-5 bg-input border border-input-border text-foreground placeholder:text-placeholder focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm"
              />
            </div>

            {/* Event Type */}
            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Event Type <span className="text-risk-high">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.eventType}
                  onChange={(e) => onChange({ eventType: e.target.value })}
                  className="w-full h-14 px-5 pr-12 bg-input border border-input-border text-foreground focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm appearance-none cursor-pointer"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value} className="bg-popover">
                      {type.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Expected Attendance */}
            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Expected Attendance <span className="text-risk-high">*</span>
              </label>
              <input
                type="number"
                value={formData.expectedAttendance}
                onChange={(e) => onChange({ expectedAttendance: e.target.value })}
                placeholder="e.g., 5000"
                min="1"
                className="w-full h-14 px-5 bg-input border border-input-border text-foreground placeholder:text-placeholder focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {formData.expectedAttendance && (
                <div className="text-xs font-mono text-muted-foreground mt-2">
                  {parseInt(formData.expectedAttendance).toLocaleString()} attendees
                </div>
              )}
            </div>

            {/* Event Date */}
            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Event Date <span className="text-risk-high">*</span>
              </label>
              <input
                type="date"
                value={formData.eventDate}
                onChange={(e) => onChange({ eventDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="w-full h-14 px-5 bg-input border border-input-border text-foreground focus:outline-none focus:border-accent-functional focus:ring-1 focus:ring-accent-functional font-mono text-sm [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-10 py-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">
              All fields required
            </span>
            <button
              onClick={onNext}
              disabled={!isValid}
              className={`
                h-10 px-6 text-sm font-medium border transition-colors
                ${isValid
                  ? "bg-foreground text-background border-foreground hover:bg-foreground/90"
                  : "bg-muted text-muted-foreground border-border cursor-not-allowed"
                }
              `}
            >
              Continue to Step 2
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
