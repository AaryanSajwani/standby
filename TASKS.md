# Tasks — Minimum Path

Goal: working product, real users, competition-ready. Least work, least money.

**Total cost of everything in Phase 1: $0.**

---

## Phase 1 — Ship it, no money on the platform

No entity. No EIN. No taxes. No Stripe. Organizers and medics settle payment
directly with each other; Standby collects nothing and holds nothing.

### Do first (10 minutes, before anything else)

- [ ] **Audit git history for secrets, then make the repo public** — *audit run 2026-07-26: CLEAN.*
      Every match of the grep below is the variable **name** in committed docs/migrations
      (CLAUDE.md, TASKS.md, migration comments), never an actual key value — no `sk_live`/
      `sk_test`/`service_role` secret was ever committed. Making the repo public is your call.
  ```bash
  git log --all -p | grep -inE 'service_role|sk_live|sk_test|SUPABASE_SERVICE|_SECRET' | head -50
  ```
  - Anything found → rotate that key in Supabase/Stripe immediately, assume it's compromised
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to be public. `service_role` is NOT — it bypasses every RLS policy you wrote.
  - Public repo = free Vercel collaboration, no Pro plan needed

- [ ] **Add Tanay to the GitHub org** — free
- [ ] **Add Tanay as owner on Supabase** — free on any plan, org settings → Team → Invite

### Build (see standby-build-prompts.md)

> **Foundations landed 2026-07-26** (autonomous pass — see `standby-autonomous-progress.md`).
> The pure, unit-tested logic + reviewable SQL for both PRs is written and `pnpm build` +
> `pnpm test` (66 tests) are green. What remains is DB apply + app-page wiring + the one
> product decision below — all of which need you (they touch a live, auto-deploying prod DB).

- [ ] **PR A** — events + bookings + acceptance flow
  - Organizer creates one event, adds N medic slots, each slot is its own booking
  - Both request paths supported (see decision below)
  - ✅ **Decision RESOLVED (2026-07-27): support BOTH paths.**
    - *Direct-request:* organizer picks a specific verified EMT → `pending` booking →
      EMT accepts|declines. (Already live.)
    - *Open-claim, organizer-approved:* organizer posts an `open` slot → verified medics
      *request* to fill it → organizer accepts one. Both converge on `accepted`.
  - ✅ **Done:** `lib/bookings/state-machine.ts` (single transition source of truth,
    `open → accepted` now organizer-initiated); `lib/bookings/applications.ts` (medic
    application lifecycle + `planAcceptance` accept-one-reject-the-rest, matrix-tested);
    `migrations/0009_booking_lifecycle.sql` (audit trail + lifecycle columns + superset
    trigger) and `migrations/0011_open_claim_applications.sql` (applications table + open-slot
    insert policy). `pnpm test` 85 green, `pnpm build` green.
  - ✅ **Wired 2026-07-28:** open-claim app surfaces built + build/test green.
    Organizer: `app/events/[id]/open-slot-manager.tsx` (post open slot · review
    applicants · accept). Medic: `app/open-shifts/` (browse · request to fill ·
    withdraw). Service-role accept: `app/api/bookings/accept-application/route.ts`.
    Found + fixed an RLS gap → new `migrations/0012_open_slot_visibility.sql`
    (medics couldn't SEE open slots, which also blocked 0011's apply-insert).
  - ⏳ **Left (needs you):** you've applied 0009/0010/0011 — **apply
    `0012_open_slot_visibility.sql`** (after 0011), then push so the wired pages
    deploy, and runtime-verify the flow on prod (post an open slot → apply as a
    second account → accept). Direct-request path was already live and unchanged.
- [ ] **PR B** — QR check-in verification + two-sided reviews + reliability stats
  - This is the actual differentiator. Free to build, no legal exposure.
  - ✅ **Done:** `lib/shifts/verification-code.ts` (rotating TOTP check-in code, skew-window
    tested), `lib/reviews/reliability.ts` (shrinkage + computed reliability), `lib/reviews/
    content-guard.ts` (email/phone/PHI + off-platform-link/obfuscation/unicode guards);
    `migrations/0010_checkin_and_reviews.sql` (check-in + double-blind reviews + reliability view)
  - 🔒 **Hardened 2026-07-27** after an adversarial review of 0010: fixed 4 real defects
    (review-subject retargeting, published_at edit-lock bypass, reliability-view visibility,
    reply retargeting) — all in the unapplied SQL. See `migrations/README.md`.
  - ⏳ **Left (needs you):** apply 0010 (after 0009), wire the medic-code / organizer-verify /
    review UIs + the publication + release cron
- [ ] **Payment coordination copy** — booking page shows the agreed rate and
      "Settle payment directly with your medic." That's it.

### Carried over (quick wins)

- [ ] Click "I've already added these records" in Resend to verify `send.callstandby.org` *(dashboard — needs you)*
- [x] ~~Delete inert `availability-calendar.jsx` from repo root~~ (2026-07-26)
- [x] ~~Fix `bg-risk-low` color collision on selected calendar days~~ (2026-07-26) — selected/range days now use the neutral `bg-foreground`/`text-background` inversion, not the green risk-low token
- [ ] Publish Google OAuth app out of Testing mode *(dashboard — needs you)*
- [x] ~~Decide full-coverage vs. any-overlap on the availability filter~~ (2026-07-26) — applied **any-overlap** (the recommendation) in `StaffingMarketplace.tsx`; one-line flip back to `.every()` if you disagree

### Founder housekeeping (20 minutes, free, do it once)

- [ ] **Write one page, both sign it, save the PDF.** Not a legal production —
      a shared doc with: who owns what percentage, that all Standby code and IP
      belongs to the company (not to whoever's GitHub account it lives in), and
      what happens if one of you leaves.
  - This costs nothing and takes 20 minutes. It's the only "legal" item in Phase 1
    because the thing it protects against is each other, not the government.
  - Formalize properly later, if there's ever a reason to.

---

## Phase 2 — Only when you actually need to take money

Triggers: a competition requires demonstrated revenue, or an organizer says
"I'd use this if I could just pay through it."

Not before. Every item below is work that produces nothing a judge or user
will notice until money is actually moving.

- [ ] **Form the AZ LLC** — ecorp.azcc.gov, $50, ~3 days
  - Statutory agent: a Phoenix home address in Maricopa County works and is free.
    Maricopa/Pima = automatically exempt from the newspaper publication requirement.
  - No annual report required in Arizona, ever
- [ ] **Get the EIN** — irs.gov, free, 10 minutes, instant
- [ ] **Open a business bank account** — bring Articles + EIN
- [ ] **Stripe Checkout + manual payouts** (NOT Connect)
  - Organizer pays via Checkout, money lands in your Stripe balance
  - You Venmo the medic after the shift confirms
  - ~1 day of code vs. ~2 weeks for the full Connect flow
  - At 5–10 bookings/month this is completely fine. Do things that don't scale.

## Phase 3 — Only at real volume

Everything here is premature until you're doing 20+ paid bookings a month.

- [ ] Stripe Connect Express, automated escrow-style holds and transfers
      (full spec preserved in standby-payments-full-spec.md — don't read it yet)
- [ ] 1099-NEC handling for medics over $600/yr
- [ ] Arizona TPT question — ask a CPA whether a marketplace commission is taxable
- [ ] Founder vesting + IP assignment done properly
- [ ] Delaware C-corp conversion — trigger is taking outside money, not a date
- [ ] Insurance: general liability + professional liability
- [ ] Worker classification review

---

## Done

- [x] ~~Take rate decided: 15% + $15 minimum fee~~ (2026-07-26) — model is settled even
      though it's not implemented; that's enough for a pitch
- [x] ~~Multi-medic model decided~~ (2026-07-26) — one event, N independent bookings
- [x] ~~Aaryan added Vercel DNS records for `send.callstandby.org`~~ (2026-07-26)
- [x] ~~Aaryan redeployed after the availability calendar merge~~ (2026-07-26)
