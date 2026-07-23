"use client"

import { CalendarPlus, Download } from "lucide-react"
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

// All-day event on the event date — we don't store a start time, so duration goes in the
// description rather than faking a clock time. End date is exclusive for all-day events
// in both the iCalendar spec and the Google Calendar template URL.
function allDayRange(dateISO: string): { start: string; end: string } {
  const [y, m, d] = dateISO.split("-").map(Number)
  const endDate = new Date(Date.UTC(y, m - 1, d + 1))
  return {
    start: `${y}${pad(m)}${pad(d)}`,
    end: `${endDate.getUTCFullYear()}${pad(endDate.getUTCMonth() + 1)}${pad(endDate.getUTCDate())}`,
  }
}

const buildDescription = ({ counterpartName, durationHours }: AddToCalendarButtonProps) =>
  `Standby event medical coverage${counterpartName ? ` — ${counterpartName}` : ""}. Approximately ${durationHours} hours of coverage.`

function googleCalendarUrl(props: AddToCalendarButtonProps): string {
  const { start, end } = allDayRange(props.dateISO)
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${props.eventName} — medical coverage`,
    dates: `${start}/${end}`,
    details: buildDescription(props),
  })
  if (props.location) params.set("location", props.location)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function buildIcs(props: AddToCalendarButtonProps): string {
  const { start, end } = allDayRange(props.dateISO)
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  const uid = `${start}-${Math.random().toString(36).slice(2)}@callstandby.org`
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Standby//Event Medical Coverage//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${esc(props.eventName)} — medical coverage`,
    props.location ? `LOCATION:${esc(props.location)}` : "",
    `DESCRIPTION:${esc(buildDescription(props))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n")
}

// Primary action deep-links into Google Calendar with everything prefilled; the
// small secondary button keeps the provider-free .ics download for Apple/Outlook.
export function AddToCalendarButton(props: AddToCalendarButtonProps) {
  if (!props.dateISO) return null

  const handleIcsDownload = () => {
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
    <span className={cn("inline-flex items-stretch gap-1", props.className)}>
      <a
        href={googleCalendarUrl(props)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "rounded-none font-mono text-[10px] uppercase tracking-wider gap-1.5 flex-1"
        )}
      >
        <CalendarPlus className="w-3.5 h-3.5" />
        {props.label ?? "Add to calendar"}
      </a>
      <button
        type="button"
        onClick={handleIcsDownload}
        title="Download .ics file (Apple / Outlook)"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "rounded-none px-2 shrink-0"
        )}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="sr-only">Download .ics file</span>
      </button>
    </span>
  )
}
