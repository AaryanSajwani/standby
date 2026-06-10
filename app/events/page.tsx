import Link from "next/link"
import { redirect } from "next/navigation"
import { Calendar, MapPin, Users, Clock, FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { BOOKING_COLUMNS, formatEventDate, mapBooking, type RawBooking, type Booking } from "@/lib/bookings"
import { joinedFullName } from "@/lib/emt"
import { EVENT_TYPE_LABELS } from "@/lib/assessment"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export const metadata = { title: "Events — Standby" }

const STATUS_STYLES: Record<Booking["status"], { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "border-risk-medium/30 bg-risk-medium/5 text-risk-medium" },
  accepted:  { label: "Accepted",  className: "border-risk-low/30 bg-risk-low/5 text-risk-low" },
  declined:  { label: "Declined",  className: "border-border text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "border-border text-muted-foreground" },
}

export default async function EventsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth?role=organizer&next=/events")

  const { data: rawBookings, error } = await supabase
    .from("bookings")
    .select(`${BOOKING_COLUMNS}, emt:profiles!bookings_emt_id_fkey ( full_name )`)
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false })

  if (error) console.error("[/events] bookings query failed:", error.message)

  const bookings = (rawBookings ?? []).map((row) =>
    mapBooking(row as unknown as RawBooking, joinedFullName(row.emt) ?? "EMT")
  )

  const { data: assessments, error: assessError } = await supabase
    .from("assessments")
    .select("id, event_name, event_type, event_date, expected_attendance, risk_score, created_at")
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false })

  if (assessError) console.error("[/events] assessments query failed:", assessError.message)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-10">

        {/* Page header */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Events</span>
          <h1 className="text-foreground text-2xl md:text-3xl font-semibold leading-tight">
            Your coverage requests
          </h1>
          <p className="text-muted-foreground text-sm">
            Track booking requests you&apos;ve sent to EMT personnel.
          </p>
        </div>

        {/* Saved assessments */}
        {(assessments ?? []).length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Saved assessments</h2>
              <span className="font-mono text-[10px] border border-border text-muted-foreground px-2 py-0.5 tabular-nums">
                {(assessments ?? []).length}
              </span>
            </div>
            <div className="flex flex-col gap-px">
              {(assessments ?? []).map((a) => {
                const score = a.risk_score ?? 0
                const riskClass =
                  score <= 3 ? "border-risk-low/30 bg-risk-low/5 text-risk-low" :
                  score <= 5 ? "border-risk-medium/30 bg-risk-medium/5 text-risk-medium" :
                  "border-risk-high/30 bg-risk-high/5 text-risk-high"
                return (
                  <div key={a.id} className="border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-foreground font-medium leading-tight truncate">{a.event_name}</span>
                        <span className="text-muted-foreground text-xs font-mono">
                          {EVENT_TYPE_LABELS[a.event_type] ?? a.event_type}
                          {a.event_date ? ` · ${formatEventDate(a.event_date)}` : ""}
                          {a.expected_attendance ? ` · ${a.expected_attendance.toLocaleString()} attendees` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 tabular-nums ${riskClass}`}>
                        Risk {score}/10
                      </span>
                      <Link
                        href="/personnel"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none font-mono text-[10px] uppercase tracking-wider")}
                      >
                        Find staffing
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Bookings */}
        <section className="flex flex-col gap-4">
          {(bookings.length > 0 || (assessments ?? []).length > 0) && (
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Booking requests</h2>
              {bookings.length > 0 && (
                <span className="font-mono text-[10px] border border-border text-muted-foreground px-2 py-0.5 tabular-nums">
                  {bookings.length}
                </span>
              )}
            </div>
          )}
        {bookings.length === 0 ? (
          <div className="border border-border bg-card px-6 py-12 flex flex-col items-center gap-4 text-center">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">No bookings yet</span>
              <p className="text-sm text-muted-foreground max-w-sm">
                Run a risk assessment to get a staffing recommendation, then request
                EMTs from the personnel marketplace.
              </p>
            </div>
            <Link href="/assess" className={cn(buttonVariants(), "rounded-none font-mono text-xs uppercase tracking-wider")}>
              Run assessment
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-px">
            {bookings.map((b) => {
              const status = STATUS_STYLES[b.status]
              const muted = b.status === "declined" || b.status === "cancelled"
              return (
                <div key={b.id} className={`border border-border bg-card flex flex-col gap-0 ${muted ? "opacity-40" : ""}`}>
                  <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-foreground font-medium text-base leading-tight truncate">{b.eventName}</span>
                      <span className="text-muted-foreground text-xs font-mono">{b.eventType} · {b.counterpartName}</span>
                    </div>
                    <span className={`font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 shrink-0 ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-0 divide-x divide-y md:divide-y-0 divide-border">
                    {[
                      { icon: <Calendar className="w-3 h-3" />, label: "Date",       value: b.date },
                      { icon: <MapPin   className="w-3 h-3" />, label: "Location",   value: b.location },
                      { icon: <Users    className="w-3 h-3" />, label: "Attendance", value: b.attendance.toLocaleString() },
                      { icon: <Clock    className="w-3 h-3" />, label: "Duration",   value: `${b.durationHours} hrs` },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex flex-col gap-1 px-4 py-3">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          {icon}{label}
                        </span>
                        <span className="font-mono text-sm tabular-nums text-foreground">{value}</span>
                      </div>
                    ))}
                    <div className="flex flex-col gap-1 px-4 py-3">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Est. total</span>
                      <span className="font-mono text-sm tabular-nums text-foreground">
                        ${Math.round(b.hourlyRate * b.durationHours).toLocaleString()}
                        <span className="text-muted-foreground"> (${b.hourlyRate}/hr)</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </section>

      </div>
    </main>
  )
}
