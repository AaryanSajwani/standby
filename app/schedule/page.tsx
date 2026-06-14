import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarDays, MapPin, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { BOOKING_COLUMNS, mapBooking, type RawBooking, type Booking } from "@/lib/bookings"
import { joinedFullName } from "@/lib/emt"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata = { title: "Schedule — Standby" }

const STATUS_STYLES: Record<Booking["status"], { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "border-risk-medium/30 bg-risk-medium/5 text-risk-medium" },
  accepted:  { label: "Confirmed", className: "border-risk-low/30 bg-risk-low/5 text-risk-low" },
  declined:  { label: "Declined",  className: "border-border text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "border-border text-muted-foreground" },
}

export default async function SchedulePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth?role=organizer&next=/schedule")

  const today = new Date().toISOString().slice(0, 10)

  // Upcoming coverage only — confirmed or still pending, soonest first
  const { data: rawBookings, error } = await supabase
    .from("bookings")
    .select(`${BOOKING_COLUMNS}, emt:profiles!bookings_emt_id_fkey ( full_name )`)
    .eq("organizer_id", user.id)
    .in("status", ["pending", "accepted"])
    .gte("event_date", today)
    .order("event_date", { ascending: true })

  if (error) console.error("[/schedule] bookings query failed:", error.message)

  const upcoming = (rawBookings ?? []).map((row) =>
    mapBooking(row as unknown as RawBooking, joinedFullName(row.emt) ?? "EMT")
  )

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Schedule</span>
          <h1 className="text-foreground text-2xl md:text-3xl font-semibold leading-tight">
            Upcoming coverage
          </h1>
          <p className="text-muted-foreground text-sm">
            Confirmed and pending shifts, soonest first. Manage individual requests on your{" "}
            <Link href="/events" className="text-foreground underline underline-offset-2">events page</Link>.
          </p>
        </div>

        {upcoming.length === 0 ? (
          <div className="border border-border bg-card px-6 py-12 flex flex-col items-center gap-4 text-center">
            <CalendarDays className="w-6 h-6 text-muted-foreground" />
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">No upcoming coverage</span>
              <p className="text-sm text-muted-foreground max-w-sm">
                Once you request an EMT and they accept, the shift shows up here on its event date.
              </p>
            </div>
            <Link href="/assess" className={cn(buttonVariants(), "rounded-none font-mono text-xs uppercase tracking-wider")}>
              Run assessment
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-px">
            {upcoming.map((b) => {
              const status = STATUS_STYLES[b.status]
              return (
                <div key={b.id} className="border border-border bg-card flex flex-col md:flex-row md:items-center gap-4 px-5 py-4">
                  {/* Date block */}
                  <div className="flex items-center gap-3 md:w-44 shrink-0">
                    <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-mono text-sm tabular-nums text-foreground">{b.date}</span>
                  </div>

                  {/* Event + EMT */}
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="text-foreground font-medium leading-tight truncate">{b.eventName}</span>
                    <span className="text-muted-foreground text-xs font-mono flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>{b.counterpartName}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{b.location}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{b.durationHours} hrs</span>
                    </span>
                  </div>

                  <span className={`font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 shrink-0 self-start md:self-auto ${status.className}`}>
                    {status.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
