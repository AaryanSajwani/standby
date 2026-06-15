"use client"

import { CalendarPlus } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AddToCalendarButtonProps {
  eventName: string
  dateISO: string // YYYY-MM-DD
  location: string
  durationHours: number
  counterpartName?: string
  className?: string
  label?: string
}

const pad = (n: number) => String(n).padStart(2, "0")
const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n")

// All-day VEVENT on the event date — we don't store a start time, so duration goes in the
// description rather than faking a clock time. A provider-free "calendar entry" (§5).
function buildIcs({ eventName, dateISO, location, durationHours, counterpartName }: AddToCalendarButtonProps): string {
  const [y, m, d] = dateISO.split("-").map(Number)
  const start = `${y}${pad(m)}${pad(d)}`
  const endDate = new Date(Date.UTC(y, m - 1, d + 1)) // DTEND is exclusive for all-day events
  const end = `${endDate.getUTCFullYear()}${pad(endDate.getUTCMonth() + 1)}${pad(endDate.getUTCDate())}`
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  const uid = `${start}-${Math.random().toString(36).slice(2)}@callstandby.org`
  const desc = `Standby event medical coverage${counterpartName ? ` — ${counterpartName}` : ""}. Approximately ${durationHours} hours of coverage.`
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Standby//Event Medical Coverage//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${esc(eventName)} — medical coverage`,
    location ? `LOCATION:${esc(location)}` : "",
    `DESCRIPTION:${esc(desc)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n")
}

export function AddToCalendarButton(props: AddToCalendarButtonProps) {
  const handleClick = () => {
    if (!props.dateISO) return
    const blob = new Blob([buildIcs(props)], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${props.eventName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "event"}-coverage.ics`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "rounded-none font-mono text-[10px] uppercase tracking-wider gap-1.5",
        props.className
      )}
    >
      <CalendarPlus className="w-3.5 h-3.5" />
      {props.label ?? "Add to calendar"}
    </button>
  )
}
