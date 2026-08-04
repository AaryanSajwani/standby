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
| `0007_prelaunch_hardening.sql` | Private cert bucket + owner policies, booking status-transition trigger, numeric sanity bounds, notification dedupe table | **Applied** (2026-07-23) | No — constraints/policies legit clients never hit |
| `0008_scan_hardening.sql` | Scan fixes: `verified` INSERT-immutable on emt_profiles (F2), bookings INSERT must name a verified EMT (F4/F1), revoke authenticated EXECUTE on the notification RPC (F1) | **Not yet applied** | Section 3 pairs with the service-role notification route — apply + deploy together |
| `0009_booking_lifecycle.sql` | PR A: booking_state_transitions audit trail, events lifecycle columns, widened booking-status vocabulary + superset transition trigger | **Not yet applied** | §1–2 additive/safe; §3 changes live status enforcement (written as a superset) — apply with PR A app code |
| `0010_checkin_and_reviews.sql` | PR B: shift_verification_secrets, check_ins, reviews (+revisions/replies/reports) with the double-blind read policy, emt_reliability_stats view | **Not yet applied** | Depends on 0009; apply with PR B app code. Hardened 2026-07-27 after adversarial review — see note below |
| `0011_open_claim_applications.sql` | PR A open path: `booking_applications` (medics request open slots) + a sibling bookings INSERT policy for `open` slots | **Not yet applied** | Depends on 0009 (the `open` status + superset trigger). Apply with the open-claim app code. Organizer accept/reject is a service-role action (multi-row atomic — see `lib/bookings/applications.ts` `planAcceptance`) |
| `0012_open_slot_visibility.sql` | PR A open path (gap fix): SELECT policy so medics can SEE open slots — required for the board AND for 0011's application-insert EXISTS check to pass | **Not yet applied** | Depends on 0009 + 0011. Apply AFTER 0011. Without it the medic apply-insert is rejected by its own RLS (medic can't SELECT the open booking). Additive permissive policy |
| `0013_shift_time_and_self_attest.sql` | PR B follow-up: `bookings.starts_at` (shift start timestamp) + private `check-in-attestations` Storage bucket (owner-folder, append-only) | **Not yet applied** | No — nullable column (NULL = no time gate, exactly pre-0013 behavior) + additive bucket. Ships WITH the app code that reads `starts_at` (shift page selects it), so apply before/with that deploy |

> **0010 review-security hardening (2026-07-27).** An adversarial review found four
> real defects in the *reviews* surface, all now fixed IN THIS FILE (before it was ever
> applied): (1) an author could raw-`UPDATE` `subject_user_id` to plant a fabricated
> review on any user; (2) `published_at` was client-mutable, permanently defeating the
> 24h edit lock; (3) `emt_reliability_stats` (security_invoker over participant-only
> `bookings`) returned empty/misleading data to the public — it now runs definer-rights
> over **aggregate-only** columns and is granted to `anon`/`authenticated`; (4)
> `review_replies` could be retargeted onto another published review. Guard triggers now
> pin every immutable column on `reviews` and `review_replies`. The verification block at
> the bottom of 0010 exercises each fix.

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

### 0009 — Booking lifecycle (PR A)
- **Single source of truth for transitions:** `lib/bookings/state-machine.ts`
  (unit-tested, `pnpm test`). Server-side status writes should call
  `assertTransition()` and record a `booking_state_transitions` row in the same
  transaction. The migration's superset trigger is the DB backstop.
- **Product decision RESOLVED (2026-07-27): support BOTH paths.** Direct-request
  (`pending → accepted|declined`, organizer names a verified EMT) AND open-claim
  (`open` slot → organizer accepts an applicant → `accepted`). The `open → accepted`
  transition is now ORGANIZER-initiated; the medic side is the applications layer
  (0011). Both converge on `accepted`.
- Reads degrade gracefully (empty) if the columns/table are absent.

### 0011 + 0012 — Open-claim applications (PR A, open path) — WIRED 2026-07-28
- **Table:** `booking_applications` — one row per (open booking, applying medic),
  so many medics can apply to one slot. RLS: verified-medic insert, medic
  self-withdraw (guarded), organizer + applicant read.
- **Server action (service-role):** the organizer's accept is multi-row and
  atomic — set `booking.emt_id`, move the booking `open → accepted`, reject the
  sibling applications. Route: `app/api/bookings/accept-application/route.ts`
  (authorizes the caller as the slot's organizer under RLS, then applies the
  tested `planAcceptance()` with the service role; the update is guarded
  `.eq("status","open")` so a concurrent double-accept 409s instead of double-booking).
- **Bookings insert:** a sibling policy (`organizer_insert_open_slot`) lets an
  organizer post an `open` slot (emt_id null); the direct-request insert (verified
  EMT, `pending`) is untouched.
- **0012 (gap fix):** `emt_select_open_slots` SELECT policy — a browsing medic
  couldn't see open slots (participant-only bookings RLS), which ALSO made 0011's
  applicant-insert EXISTS check fail. 0012 exposes only `open` rows to users with
  an `emt_profiles` row. Apply 0012 right after 0011.
- **App surfaces (wired, ship with the migrations):**
  - Organizer: `app/events/[id]/open-slot-manager.tsx` — post an open slot, review
    applicants (name/cert/rate/location via public reads), accept one.
  - Medic: `app/open-shifts/` (board `+ open-shift-board.tsx`) — browse open slots,
    request to fill (optional note), withdraw. Proxy-protected (EMT); in EMT nav.
- Reads degrade gracefully (empty) if the tables/policies are absent.

### 0010 — Check-in + reviews (PR B) — WIRED 2026-07-28
- **Check-in:** `lib/shifts/verification-code.ts` generates the rotating code from
  the per-booking secret (service-role only, lazily created). The medic's page
  (`/shifts/[id]`) shows the current code; the organizer verifies via manual
  6-digit entry. Routes: `POST /api/shifts/code` (medic fetches code) and
  `POST /api/shifts/verify` (organizer verifies → writes `check_ins` + transitions
  accepted→checked_in / checked_in→completed). The verify route rate-limits
  attempts per (booking, organizer) — the brute-force cap the code module requires.
  Geolocation captured best-effort. **Deferred:** QR camera scanning (manual
  entry is the shipped path; noted in TASKS.md).
- **Reviews:** double-blind. Submit via `POST /api/reviews` (server-side
  content-guard + structural RLS insert); both-submitted publishes eagerly, and
  `GET /api/cron/publish-reviews` (daily, `vercel.json`, `CRON_SECRET`-gated) is the
  backstop that also closes the 14-day single-sided window. Forms + code panels:
  `app/shifts/[id]/`. Dimensions: `lib/reviews/dimensions.ts`. Content guardrails:
  `lib/reviews/content-guard.ts`. Display math: `lib/reviews/reliability.ts`.
- **Reputation on `/emt/[id]`:** reliability (computed, from `emt_reliability_stats`)
  shown ABOVE published reviews; sparse (<5) shows "New to Standby". Mock sample
  profiles carry no reputation (never fabricate trust signals).
- **Test the blind window with a direct client query**, not the UI (§ verification).
- **Env needed:** `CRON_SECRET` (Vercel Cron auth) + the existing
  `SUPABASE_SERVICE_ROLE_KEY`. Without them the flow degrades (logged skip).

### 0013 — Shift start time + self-attest fallback (PR B follow-up)
- **Time gate (60 min before start):** `lib/shifts/timing.ts` (unit-tested) defines
  the windows; enforced server-side in `POST /api/shifts/code` (medic) and
  `POST /api/shifts/verify` (organizer). `bookings.starts_at` is **nullable** — a
  booking with no start time has NO gate (check-in anytime), exactly the pre-0013
  behavior, so legacy rows are untouched. Start time is collected (optional) in both
  creation forms: `app/emt/[id]/request-emt.tsx` and `app/events/[id]/open-slot-manager.tsx`.
- **30-min self-attest fallback:** `POST /api/shifts/self-attest` — when no organizer
  verification lands within 30 min of start, the assigned medic attests they're on
  site with best-effort geo, an optional Storage photo (uploaded client-side to the
  medic's own folder in `check-in-attestations`), and an optional note. Records a
  `check_ins` row (`method='fallback'`, `verification_quality='self_attested'`) and
  transitions accepted→checked_in via the service role (guarded on prior status →
  idempotent). Organizer is emailed (best-effort, `lib/notifications.ts`
  `selfAttestCheckInEmail`). UI: the self-attest panel in `app/shifts/[id]/shift-client.tsx`,
  shown to the medic only once 30 min past start.
- **Review edit (24h) + reply** (NO new migration — uses 0010 tables): `POST
  /api/reviews/edit` (author edits own review while pending or ≤24h after publish;
  DB guard is the real lock; appends a `review_revisions` row) and `POST
  /api/reviews/reply` (the review's subject posts/edits one public reply). UI: inline
  edit + reply on `/shifts/[id]`; replies also render read-only on `/emt/[id]`.
- Reads degrade gracefully if `starts_at` is null; the fallback + gate simply don't
  engage. **This whole batch ships together** — the shift page selects `starts_at`,
  so 0013 must be applied before/with the deploy.

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
