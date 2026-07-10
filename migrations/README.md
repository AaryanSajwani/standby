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
| `0004_security_hardening.sql` | Abuse backstops: upload caps, cross-tenant event_id, payload/date bounds | **Pending** — run any time | No — constraints legit clients never hit |

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
- **Real email/SMS notifications (§5):** Resend/Postmark (email) or Twilio (SMS) account +
  API key. The in-app concierge loop + `.ics` calendar export already shipped; this adds push.
- **Premium venue autocomplete / trauma-center dataset (§4.3):** a free version shipped
  2026-07-10 — Overpass/OSM nearest-hospital auto-fill (straight-line miles, ER tag when
  OSM has it) on the Medical Resources step. Optional paid upgrade remains: Google Places
  autocomplete + a verified trauma-level dataset (CMS PoS / state registry) for
  designation-level accuracy (Level I–IV) and driving distance.
