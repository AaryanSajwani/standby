import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { BOOKING_COLUMNS, mapBooking, type RawBooking } from "@/lib/bookings"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { OpenShiftBoard, type OpenShift } from "./open-shift-board"

export const metadata = { title: "Open shifts — Standby" }

// Force dynamic: the board reflects live open slots + the medic's own applications.
export const dynamic = "force-dynamic"

export default async function OpenShiftsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth?role=emt&next=/open-shifts")

  // The board is for medics. emt_profiles.verified gates APPLYING (migration
  // 0011); a pending medic can still browse (migration 0012 SELECT policy keys
  // on having an emt_profiles row, not on verified).
  const { data: profile } = await supabase
    .from("emt_profiles")
    .select("verified")
    .eq("user_id", user.id)
    .maybeSingle()

  const isMedic = profile != null
  const verified = profile?.verified === true

  // Open slots visible to a medic (migration 0012). Exclude any the medic posted
  // as an organizer (they can't apply to their own event anyway).
  const { data: rawOpen } = isMedic
    ? await supabase
        .from("bookings")
        .select(`${BOOKING_COLUMNS}, organizer_id`)
        .eq("status", "open")
        .neq("organizer_id", user.id)
        .order("event_date", { ascending: true })
    : { data: [] as unknown[] }

  // The medic's own applications, to show which slots they've already requested.
  const { data: myApps } = isMedic
    ? await supabase
        .from("booking_applications")
        .select("id, booking_id, status")
        .eq("emt_id", user.id)
    : { data: [] as { id: string; booking_id: string; status: string }[] }

  const appByBooking = new Map(
    (myApps ?? []).map((a) => [a.booking_id as string, { id: a.id as string, status: a.status as OpenShift["applicationStatus"] }])
  )

  const shifts: OpenShift[] = (rawOpen ?? []).map((row) => {
    const b = mapBooking(row as unknown as RawBooking, "")
    const app = appByBooking.get(b.id)
    return {
      id: b.id,
      eventName: b.eventName,
      eventType: b.eventType,
      date: b.date,
      location: b.location,
      attendance: b.attendance,
      durationHours: b.durationHours,
      hourlyRate: b.hourlyRate,
      notes: b.notes,
      applicationId: app?.id ?? null,
      applicationStatus: app?.status ?? null,
    }
  })

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Open shifts</span>
          <h1 className="text-foreground text-2xl md:text-3xl font-semibold leading-tight">Coverage looking for a medic</h1>
          <p className="text-muted-foreground text-sm">
            Organizers post open slots here. Request the ones you can cover — the organizer reviews requests and confirms one medic per slot.
          </p>
        </div>

        {!isMedic ? (
          <div className="border border-border bg-card px-6 py-10 flex flex-col items-center gap-3 text-center">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Medics only</span>
            <p className="text-sm text-muted-foreground max-w-sm">
              Complete your EMT profile to browse and request open shifts.
            </p>
            <Link href="/emt-dashboard" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none font-mono text-[10px] uppercase tracking-wider")}>
              Go to dashboard
            </Link>
          </div>
        ) : (
          <OpenShiftBoard viewerId={user.id} verified={verified} shifts={shifts} />
        )}
      </div>
    </main>
  )
}
