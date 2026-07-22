# Migrations

SQL for the two schema-dependent items from `STANDBY-IMPROVEMENTS.md` that can't ship
to the live site without a database change. They are **not applied automatically** — run
them in the Supabase SQL editor (the same place the auth migration lives).

> **Why these aren't wired in the app yet:** `master` auto-deploys to callstandby.org.
> Shipping code that reads/writes a table that doesn't exist would break the live site,
> and these can't be verified without running against the real database. So the SQL is
> prepared and reviewable here; the app code lands the moment the migration is run (and
> can then be tested against the running app).

| File | Feature | Status | Breaking? |
|------|---------|--------|-----------|
| `0001_emt_availability.sql` | §5 Per-EMT availability calendar | **Applied + wired** (2026-06-15) | No — additive table |
| `0002_events_container.sql` | §4.2 Events as the container object | **Applied + wired** (2026-06-15) | No — nullable columns |
| `0003_events_unique_name.sql` | §4.2 Race-safe unique event name per organizer | **Applied + wired** (2026-07-10) | No — additive index |
| `0004_security_hardening.sql` | Abuse backstops: upload caps, cross-tenant event_id, payload/date bounds | **Applied** (2026-07-21) | No — constraints legit clients never hit |
| `0005_insert_rate_caps.sql` | Per-user daily insert caps (assessments/events/bookings) + supporting indexes | **Applied** (2026-07-21) | No — caps sit far above real usage |
| `0006_booking_notification_rpc.sql` | Security-definer RPC: participant emails for booking notification sends | **Applied** (2026-07-22) | No — without it, emails silently skip; in-app flow unaffected |

> Both migrations have been run and the app code is live (availability calendar on the
> EMT dashboard/profile; `events` records + `/events/[id]` container page). The "wiring
> plan" below is kept for reference / future extension.

## How to run

1. Supabase dashboard → SQL Editor → paste a file → Run.
2. Run `0001` first if you want availability; `0002` is independent and optional (phase 2).
3. Tell me it's applied and I'll wire the UI in the same session and verify it.

## Wiring plan (what lands once the table exists)

### 0001 — Availability calendar (§5)
- **EMT dashboard / onboarding:** an "Availability" panel to add & remove available dates
  (insert/delete on `emt_availability`, owner-scoped by RLS).
- **EMT profile (`/emt/[id]`) & marketplace card:** show the next few available dates.
- **`/schedule`:** fold availability in alongside confirmed bookings.
- All reads degrade gracefully (empty) if the table is absent, matching the existing
  `if (error) console.error(...)` pattern.

### 0002 — Events as container (§4.2)
- **New `/events/[id]`** event page: assessment(s) + risk report + staffing roster +
  AHJ docs under one event.
- **`/results` "Save report":** create or attach to an `events` row, set `assessments.event_id`.
- **Booking request:** carry `event_id` so a roster rolls up to its event.
- `/events` groups by event instead of listing loose bookings/assessments.
- Because `event_id` is nullable, existing rows keep working through the transition.

## Still needs a provider key (not a migration)
- **Email notifications (§5): SHIPPED 2026-07-22.** Resend key is in env (local + Vercel);
  booking request → EMT inbox, accept/decline → organizer inbox via
  `/api/notifications/booking` + `lib/notifications.ts`. Requires migration `0006` (recipient
  lookup) and the callstandby.org domain verified in Resend — until both, sends skip silently
  and the in-app loop remains the truth. **SMS (Twilio) deliberately deferred**: per-message
  cost + US A2P registration overhead isn't worth it at current volume.
- **Premium venue autocomplete / trauma-center dataset (§4.3):** a free version shipped
  2026-07-10 — Overpass/OSM nearest-hospital auto-fill (straight-line miles, ER tag when
  OSM has it) on the Medical Resources step. Optional paid upgrade remains: Google Places
  autocomplete + a verified trauma-level dataset (CMS PoS / state registry) for
  designation-level accuracy (Level I–IV) and driving distance.
