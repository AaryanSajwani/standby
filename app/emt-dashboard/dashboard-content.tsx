"use client"

import { useState } from "react"
import { Calendar, MapPin, Users, Clock, Check, X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type RequestStatus = "pending" | "accepted" | "declined"

interface EventRequest {
  id: number
  eventName: string
  eventType: string
  organizer: string
  date: string
  location: string
  attendance: number
  durationHours: number
  riskLevel: "LOW" | "MODERATE" | "HIGH"
  certRequired: string
  hourlyRate: number
  status: RequestStatus
  notes: string
}

const MOCK_REQUESTS: EventRequest[] = [
  {
    id: 1,
    eventName: "Lakeview Summer Festival",
    eventType: "Outdoor festival",
    organizer: "Chicago Events Co.",
    date: "Jul 12, 2026",
    location: "Chicago, IL",
    attendance: 800,
    durationHours: 8,
    riskLevel: "MODERATE",
    certRequired: "EMT-Basic",
    hourlyRate: 65,
    status: "pending",
    notes: "Two-stage outdoor festival. AED stations on site. Nearest hospital 3.2 mi. Arrive 45 min before doors.",
  },
  {
    id: 2,
    eventName: "Corporate Leadership Summit",
    eventType: "Corporate event",
    organizer: "Apex Group",
    date: "Jul 19, 2026",
    location: "Downtown Chicago, IL",
    attendance: 300,
    durationHours: 6,
    riskLevel: "LOW",
    certRequired: "EMT-Basic",
    hourlyRate: 55,
    status: "pending",
    notes: "Indoor conference. Low-acuity coverage. Dress business casual. Parking validated.",
  },
  {
    id: 3,
    eventName: "North Shore Triathlon",
    eventType: "Sporting event",
    organizer: "IL Endurance Events",
    date: "Jul 26, 2026",
    location: "Evanston, IL",
    attendance: 450,
    durationHours: 10,
    riskLevel: "HIGH",
    certRequired: "Paramedic",
    hourlyRate: 95,
    status: "pending",
    notes: "Multi-sport endurance event. Elevated exertion risk. Two-EMT deployment. Water station coverage required.",
  },
  {
    id: 4,
    eventName: "Riverside Concert Series",
    eventType: "Outdoor concert",
    organizer: "Metro Music Presents",
    date: "Jul 5, 2026",
    location: "Naperville, IL",
    attendance: 1200,
    durationHours: 5,
    riskLevel: "MODERATE",
    certRequired: "EMT-Basic",
    hourlyRate: 70,
    status: "accepted",
    notes: "Confirmed. Arrive 1 hr before doors open. On-site contact: events@metromusic.com.",
  },
  {
    id: 5,
    eventName: "Youth Soccer Tournament",
    eventType: "Sporting event",
    organizer: "Oak Park Rec League",
    date: "Jul 8, 2026",
    location: "Oak Park, IL",
    attendance: 600,
    durationHours: 7,
    riskLevel: "LOW",
    certRequired: "EMT-Basic",
    hourlyRate: 58,
    status: "accepted",
    notes: "Confirmed. Six-field outdoor tournament. Shade and water provided. Parking lot A.",
  },
]

const RISK_STYLES: Record<string, { label: string; className: string }> = {
  LOW:      { label: "Low risk",      className: "text-risk-low border-risk-low/30 bg-risk-low/5" },
  MODERATE: { label: "Moderate risk", className: "text-risk-medium border-risk-medium/30 bg-risk-medium/5" },
  HIGH:     { label: "High risk",     className: "text-risk-high border-risk-high/30 bg-risk-high/5" },
}

function RequestCard({
  req,
  onAccept,
  onDecline,
}: {
  req: EventRequest
  onAccept: (id: number) => void
  onDecline: (id: number) => void
}) {
  const risk = RISK_STYLES[req.riskLevel]
  const isPending  = req.status === "pending"
  const isAccepted = req.status === "accepted"
  const isDeclined = req.status === "declined"

  return (
    <div className={`border border-border bg-card flex flex-col gap-0 transition-opacity ${isDeclined ? "opacity-40" : ""}`}>
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-foreground font-medium text-base leading-tight truncate">{req.eventName}</span>
          <span className="text-muted-foreground text-xs font-mono">{req.eventType} · {req.organizer}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 ${risk.className}`}>
            {risk.label}
          </span>
          {isAccepted && (
            <span className="font-mono text-[10px] uppercase tracking-widest border border-risk-low/30 bg-risk-low/5 text-risk-low px-2 py-0.5">
              Accepted
            </span>
          )}
          {isDeclined && (
            <span className="font-mono text-[10px] uppercase tracking-widest border border-border text-muted-foreground px-2 py-0.5">
              Declined
            </span>
          )}
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-y md:divide-y-0 divide-border">
        {[
          { icon: <Calendar className="w-3 h-3" />, label: "Date",       value: req.date },
          { icon: <MapPin   className="w-3 h-3" />, label: "Location",   value: req.location },
          { icon: <Users    className="w-3 h-3" />, label: "Attendance", value: req.attendance.toLocaleString() },
          { icon: <Clock    className="w-3 h-3" />, label: "Duration",   value: `${req.durationHours} hrs` },
        ].map(({ icon, label, value }) => (
          <div key={label} className="flex flex-col gap-1 px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              {icon}{label}
            </span>
            <span className="font-mono text-sm tabular-nums text-foreground">{value}</span>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex flex-col md:flex-row gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
        <div className="flex flex-col justify-center gap-1 px-5 py-4 md:w-40 shrink-0">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Rate</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl tabular-nums font-bold text-foreground">${req.hourlyRate}</span>
            <span className="font-mono text-xs text-muted-foreground">/hr</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            ${(req.hourlyRate * req.durationHours).toLocaleString()} total est.
          </span>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-1 px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Notes from organizer</span>
          <p className="text-sm text-muted-foreground leading-relaxed">{req.notes}</p>
        </div>
        {isPending && (
          <div className="flex flex-col justify-center gap-2 px-5 py-4 md:w-44 shrink-0">
            <Button className="w-full rounded-none font-mono text-xs uppercase tracking-wider" onClick={() => onAccept(req.id)}>
              <Check className="w-3.5 h-3.5 mr-1.5" />Accept shift
            </Button>
            <Button variant="outline" className="w-full rounded-none font-mono text-xs uppercase tracking-wider" onClick={() => onDecline(req.id)}>
              <X className="w-3.5 h-3.5 mr-1.5" />Decline
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

interface DashboardContentProps {
  displayName: string
  verified: boolean
}

export function DashboardContent({ displayName, verified }: DashboardContentProps) {
  const [requests, setRequests] = useState<EventRequest[]>(MOCK_REQUESTS)

  const pending  = requests.filter((r) => r.status === "pending")
  const upcoming = requests.filter((r) => r.status === "accepted")
  const declined = requests.filter((r) => r.status === "declined")

  const accept  = (id: number) => setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "accepted" } : r))
  const decline = (id: number) => setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "declined" } : r))

  const totalEarnings = upcoming.reduce((sum, r) => sum + r.hourlyRate * r.durationHours, 0)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-10">

        {/* Verification banner */}
        {!verified && (
          <div className="border border-risk-medium/40 bg-risk-medium/5 px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-risk-medium shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xs uppercase tracking-widest text-risk-medium">
                Pending verification
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your credentials are under review. You&apos;ll appear in the marketplace once verified —
                usually within 1–2 business days.
              </p>
            </div>
          </div>
        )}

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">EMT Dashboard</span>
            <h1 className="text-foreground text-2xl md:text-3xl font-semibold leading-tight">
              Welcome back, {displayName}.
            </h1>
            <p className="text-muted-foreground text-sm">
              Review incoming event requests and manage your upcoming shifts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-risk-low" />
            <span className="font-mono text-xs text-risk-low uppercase tracking-widest">Available for bookings</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 border border-border divide-x divide-border">
          <div className="flex flex-col gap-1 px-5 py-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Pending requests</span>
            <span className="font-mono text-3xl tabular-nums font-bold text-foreground">{pending.length}</span>
          </div>
          <div className="flex flex-col gap-1 px-5 py-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Upcoming shifts</span>
            <span className="font-mono text-3xl tabular-nums font-bold text-foreground">{upcoming.length}</span>
          </div>
          <div className="flex flex-col gap-1 px-5 py-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Est. earnings</span>
            <span className="font-mono text-3xl tabular-nums font-bold text-foreground">${totalEarnings.toLocaleString()}</span>
          </div>
        </div>

        {/* Pending requests */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Incoming requests</h2>
            {pending.length > 0 && (
              <span className="font-mono text-[10px] border border-primary/30 bg-primary/5 text-primary px-2 py-0.5 tabular-nums">
                {pending.length} pending
              </span>
            )}
          </div>
          {pending.length === 0 ? (
            <div className="border border-border bg-card px-6 py-10 flex flex-col items-center gap-2 text-center">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">No pending requests</span>
              <p className="text-sm text-muted-foreground max-w-xs">New booking requests from event organizers will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-px">
              {pending.map((req) => <RequestCard key={req.id} req={req} onAccept={accept} onDecline={decline} />)}
            </div>
          )}
        </section>

        {/* Upcoming shifts */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Upcoming shifts</h2>
            {upcoming.length > 0 && (
              <span className="font-mono text-[10px] border border-risk-low/30 bg-risk-low/5 text-risk-low px-2 py-0.5 tabular-nums">
                {upcoming.length} confirmed
              </span>
            )}
          </div>
          {upcoming.length === 0 ? (
            <div className="border border-border bg-card px-6 py-10 flex flex-col items-center gap-2 text-center">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">No upcoming shifts</span>
              <p className="text-sm text-muted-foreground max-w-xs">Accept requests above to confirm your upcoming shifts.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-px">
              {upcoming.map((req) => <RequestCard key={req.id} req={req} onAccept={accept} onDecline={decline} />)}
            </div>
          )}
        </section>

        {declined.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Declined</h2>
              <span className="font-mono text-[10px] border border-border text-muted-foreground px-2 py-0.5 tabular-nums">
                {declined.length}
              </span>
            </div>
            <div className="flex flex-col gap-px">
              {declined.map((req) => <RequestCard key={req.id} req={req} onAccept={accept} onDecline={decline} />)}
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
