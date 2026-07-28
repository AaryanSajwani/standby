# Standby — Autonomous Progress Report (2026-07-26)

What was built in an autonomous pass over `TASKS.md`, `standby-build-prompts.md`,
`standby-payments-full-spec.md`, and `standby-phase2-when-you-need-it.md`. The goal
was to do everything that does **not** require your hands (dashboards, DB apply,
entity/legal, deploy) — while respecting the repo's own guardrails: `master`
auto-deploys to prod, migrations are **not** auto-applied, and the Supabase client
is untyped (new-table code compiles green but crashes at runtime until the table
exists). So the boundary is: **build + unit-test the pure logic, prepare reviewable
SQL, ship the safe quick-wins — leave DB apply, page wiring, and deploy to you.**

Verified green: **`pnpm build`** (TypeScript passes; `ignoreBuildErrors` is removed,
so this is a real gate) and **`pnpm test`** (85 tests, 7 files — as of the 2026-07-27
extension: applications layer + hardening + robustness fixes).

---

## 1. Shipped now — safe, build-verified, deployable

These touch only existing surfaces and are safe on the auto-deploying `master`.

| Change | File | Note |
|---|---|---|
| Deleted inert demo file | ~~`availability-calendar.jsx`~~ | Confirmed imported nowhere; live calendar is `components/AvailabilityCalendar.tsx` |
| Fixed `bg-risk-low` collision on selected calendar days | `components/AvailabilityCalendar.tsx` | Selected/range days now use the neutral `bg-foreground` / `text-background` inversion instead of the green **risk** token (which also colors "available"/"accepted" status — a real semantic collision) |
| Availability filter → **any-overlap** | `components/marketplace/StaffingMarketplace.tsx` | `.every()` → `.some()`, per the TASKS.md recommendation. Single-day ranges (the common case) are unchanged; multi-day now surfaces medics free on *any* day. One-line revert if you prefer full-coverage. |
| Git secret audit | — | **Clean.** Every grep match is the variable *name* in committed docs, never a key value. Making the repo public is your call. |

## 2. Shipped now — tested logic foundations (pure, no DB)

The parts of PR A / PR B / the fee model that are pure logic and fully verifiable
without a database. These are imported by nothing yet (zero runtime effect / safe to
deploy); they're the tested substrate the page-wiring will build on.

| Module | Covers | Tests |
|---|---|---|
| `lib/bookings/state-machine.ts` | The **single source of truth** for booking transitions (build-prompts: "the ONLY place transitions are written"). Full lifecycle superset of BOTH the direct-request states and the organizer-approved open-claim states; actor constraints; terminal set; legacy `cancelled` alias. `open → accepted` is organizer-initiated. | `state-machine.test.ts` — full N×N matrix, actor rules, live-subset, reachability |
| `lib/bookings/applications.ts` | **The open-claim request layer.** Application lifecycle (`applied → accepted\|rejected\|withdrawn\|expired`, organizer/medic/system actors) + `planAcceptance()` (accept one, reject the still-applied siblings, drive booking `open → accepted`). | `applications.test.ts` — matrix, actor rules, planAcceptance edge cases |
| `lib/shifts/verification-code.ts` | Rotating 6-digit check-in code (HOTP/TOTP over a per-booking secret, 60s period). **Server-only**; secret never leaves the server. | `verification-code.test.ts` — determinism, rotation, ±1 skew window, "two windows ago rejected", malformed input |
| `lib/reviews/reliability.ts` | Bayesian shrinkage `(C·m+Σ)/(C+n)`, C=5; "New to Standby" under 5 reviews; computed reliability (completion/on-time/late-cancel-90d/no-show-365d). | `reliability.test.ts` — hand-computed shrinkage, seeded-fixture reliability, rolling windows |
| `lib/reviews/content-guard.ts` | Review text guards: reject email/phone, warn on PHI (medic role only), 1000-char cap. | `content-guard.test.ts` — formats, false-positive checks |
| `lib/payments/fee.ts` | The **settled** fee model (15% + $15 floor, buyer-side, integer cents). ⚠ **Phase-2 foundation, NOT wired** — no UI, no Stripe, respecting "copy/static only". Here so the pitch's numbers have one tested source. | `fee.test.ts` — the spec's exact examples ($270→$310.50; floor engages on 2h/$35, not 6h/$45) |

Test runner added: **vitest** (`pnpm test`). Test files are excluded from the Next
build's typecheck via `tsconfig.json`, so they never affect `pnpm build`.

## 3. Prepared for you — reviewable SQL (NOT applied)

Following the repo convention (`migrations/README.md`): SQL is prepared + reviewed
here; the app code lands once you run it against Supabase.

- **`migrations/0009_booking_lifecycle.sql`** (PR A)
  - §1 `booking_state_transitions` audit trail (append-only, RLS) — additive/safe
  - §2 `events` lifecycle columns (`starts_at`, `ends_at`, `description`, `status`) — nullable/safe
  - §3 widened `bookings.status` vocabulary + a **superset** transition trigger that keeps
    every live transition legal while enabling the richer lifecycle — ⚠ apply with PR A app code
- **`migrations/0010_checkin_and_reviews.sql`** (PR B, depends on 0009)
  - `shift_verification_secrets` (service-role only, zero client policies)
  - `check_ins` (parties read, service-role writes)
  - `reviews` + `review_revisions` + `review_replies` + `review_reports` with the
    **double-blind read policy** (the crux; each migration ends with the exact
    verification queries — including the "read party B's pending review as party A" check)
  - `emt_reliability_stats` view (`security_invoker=on`), so a profile card is one query

Each migration ends with a copy-pasteable **verification block** (expected results in
comments), matching 0004–0008.

---

## 4. ✅ RESOLVED (2026-07-27): support BOTH paths

You chose to do both, and the foundation now models both:

- **Direct-request** (already live): organizer browses `/personnel`, picks a *verified*
  EMT, files a `pending` booking → EMT accepts|declines.
- **Open-claim, organizer-approved** (added): organizer posts an `open` slot (no EMT) →
  verified medics *request* to fill it (rows in `booking_applications`, so **many** can
  apply) → the organizer accepts one, which sets `booking.emt_id`, moves the booking
  `open → accepted`, and rejects the sibling requests. `open → accepted` is
  **organizer-initiated**; both paths converge on `accepted`.

New tested logic: `lib/bookings/applications.ts` (application lifecycle +
`planAcceptance()` — the accept-one-reject-the-rest plan). New SQL:
`migrations/0011_open_claim_applications.sql` (the `booking_applications` table + a sibling
`bookings` INSERT policy for open slots). The organizer's accept/reject is a **service-role
server action** because it is multi-row and atomic.

### 4b. 🔒 0010 review-security hardening (2026-07-27)

An adversarial re-review of the *reviews* surface (the part a prior spend limit had left
unverified) found **four real defects**, all fixed in the still-unapplied 0010 SQL:
1. reviews `subject_user_id` was client-mutable on UPDATE → an author could plant a
   fabricated review on **any** user. Now pinned by the guard trigger.
2. `published_at` was client-mutable → the 24h edit lock was permanently defeatable. Pinned.
3. `emt_reliability_stats` (security_invoker over participant-only `bookings`) returned
   **empty/misleading** data to the public → switched to definer-rights over
   **aggregate-only** columns (emt_id + counts, no PII), granted to `anon`/`authenticated`.
4. `review_replies` could be retargeted onto another published review. New guard trigger.

## 5. What still needs you (and only you)

- ~~Apply migrations `0009` → `0011` → `0010`~~ — **done + verified in Supabase 2026-07-28.**
- **Apply `0012_open_slot_visibility.sql`** (after 0011) — a gap fix found while wiring: a
  browsing medic couldn't SELECT open slots under participant-only bookings RLS, which ALSO
  made 0011's applicant-insert EXISTS check fail. Run its verification block.
- ~~Decide direct-request vs open-claim~~ — **done (both, §4).**
- ~~Wire the PR A app pages~~ — **done 2026-07-28** (§4c below). Push so they deploy, then
  runtime-verify on prod: post an open slot, apply from a second (verified-EMT) account,
  accept it, confirm the booking lands on that medic's dashboard.
- **Still to build — PR B:** medic check-in code screen, organizer verify screen (QR + manual),
  two-sided review forms, and the publication + release cron. Foundations
  (`verification-code.ts`, `reliability.ts`, `content-guard.ts`, migration 0010) are done +
  tested; only the UI/route wiring remains.

### 4c. ✅ Open-claim path WIRED (2026-07-28)

Build + test green (85 tests). Organizer: `app/events/[id]/open-slot-manager.tsx` — post an
open slot, review applicants, accept one. Medic: `app/open-shifts/` (+ `open-shift-board.tsx`)
— browse open slots, request to fill (optional note), withdraw; proxy-protected (EMT) and in
the EMT nav. Service-role accept: `app/api/bookings/accept-application/route.ts` — authorizes
the caller as the slot's organizer under RLS, then applies the tested `planAcceptance()` with
the service role; the booking update is guarded `.eq("status","open")` so a concurrent
double-accept 409s instead of double-booking. The direct-request path was already live and is
unchanged. NOT pushed — awaiting your review.
- **Dashboards:** Resend "I've already added these records"; publish the Google OAuth app.
- **Phase 2+ (only when taking money):** AZ LLC + EIN, Stripe — untouched, as the docs direct.

## 6. Notes / housekeeping

- **`pnpm-workspace.yaml`** was auto-created by `pnpm add` (pnpm 11 build-script approval for
  `sharp`/`msw`). Harmless; commit it with the lockfile. It (plus a pre-existing stray
  `C:\Users\tanay\package-lock.json`) is why `next build` prints a cosmetic "workspace root"
  warning. Optional silence: set `turbopack.root` in `next.config.mjs`.
- **`npm run lint` is broken pre-existing** — ESLint isn't in `package.json` (never was).
  The build's TypeScript pass is the real gate. Install eslint + a config if you want lint back.
