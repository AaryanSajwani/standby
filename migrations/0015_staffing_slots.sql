-- ───────────────────────────────────────────────────────────────────────────
-- 0015 · Staffing slots — Phase 1 schema  (adapts _private/staffing-slots-spec.md)
--
-- ⚠ PROPOSAL — NOT APPLIED. Reviewable per migrations/README.md. Do not run without
--   explicit approval. The slot_index BACKFILL and all RLS changes are deliberately
--   NOT here — they need their own separate approval (backfill = §8 below, commented
--   out; RLS = Phase 5).
--
-- DECISION (2026-08-06): ADAPT THE SPEC TO THE CODEBASE. So this migration:
--   • uses the live column `emt_id` (NOT the spec's `medic_id`) and adds
--     `invited_emt_id` for the held state (NOT `invited_medic_id`);
--   • REUSES the shipped `booking_applications` (slot-level, 0011) — no new
--     event-level `event_applications` table;
--   • REUSES the shipped `booking_state_transitions` audit trail (0009) — no new
--     `booking_events` table; just adds `hours_to_event_start` to it;
--   • COEXISTS with the live 13-value status domain (0009). The spec's status =
--     `assigned` maps to the codebase's `accepted`; we ADD `invited` + `retired`.
--     Because the domain is broader than the spec's 7 values, the spec's strict
--     biconditional CHECKs are expressed as coexistence-safe one-directional checks.
--   • FOLDS IN the emt_id NOT-NULL fix (§1) — the shipped open-claim insert policy
--     (0011) posts an open slot with emt_id NULL but the column is still NOT NULL,
--     so posting an open slot currently fails at the DB. This is the spec's Phase 1
--     "breaking change." No open slot exists yet (0 live), so no data is affected.
--
-- Additive + idempotent. Section 3 (trigger) is a strict SUPERSET of 0009's trigger.
-- ───────────────────────────────────────────────────────────────────────────

-- ── 1. Fix: emt_id must be nullable (unblocks open slots) ────────────────────
alter table public.bookings alter column emt_id drop not null;

-- ── 2. Bookings: slot + held-invitation columns ─────────────────────────────
-- slot_index is nullable (NOT the spec's `int not null`): 2 legacy bookings have
-- no event_id, and slot_index is only meaningful within an event. Meaningful for
-- event-attached slots; null for eventless legacy direct-request rows.
alter table public.bookings add column if not exists slot_index          int;
alter table public.bookings add column if not exists invited_emt_id      uuid references public.profiles (id) on delete set null;
alter table public.bookings add column if not exists invited_at          timestamptz;
alter table public.bookings add column if not exists invitation_expires_at timestamptz;
alter table public.bookings add column if not exists accepted_at         timestamptz;  -- spec's assigned_at (codebase status is `accepted`)
alter table public.bookings add column if not exists required_cert_level text;         -- enforcement hook, always null for now
-- rate_cents (integer cents) is the FORWARD single booking-rate field, matching
-- lib/payments/fee.ts. At fill, Phase 2 snapshots the medic's posted rate here.
-- The legacy dollars `offered_rate` (1–500) will be MIGRATED into rate_cents (×100)
-- and RETIRED in a separate expand→migrate→contract change AFTER the slots feature
-- ships (it touches ~8 display/input/email sites) — NOT in this migration. Until
-- then the two coexist; do not do arithmetic across the two units.
alter table public.bookings add column if not exists rate_cents          int;

-- ── 3. Bookings: widen status domain + superset transition trigger ──────────
-- Add `invited` (held) and `retired` (headcount) to the 0009 domain.
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in (
    'draft', 'open', 'invited', 'pending', 'accepted', 'confirmed', 'checked_in',
    'completed', 'declined', 'cancelled', 'cancelled_organizer',
    'cancelled_emt', 'no_show_emt', 'expired', 'retired'
  ));

-- Superset of 0009's enforce_booking_status_transition(). Every prior arc stays
-- legal; NEW arcs: open→invited, invited→accepted, invited→open (decline/rescind/
-- expire), open→retired, retired→open (headcount).
-- ⚠ Keep in lockstep with lib/bookings/state-machine.ts (Phase 2 code). Applying
--   this alone is safe — nothing performs the new arcs until the app code ships —
--   but the two must not drift.
create or replace function public.enforce_booking_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new; -- no-op update, allow
  end if;

  if old.status = 'draft'  and new.status in ('open', 'pending', 'cancelled_organizer', 'cancelled') then
    return new;
  elsif old.status = 'open'    and new.status in ('accepted', 'invited', 'retired', 'cancelled_organizer', 'cancelled', 'expired') then
    return new;
  elsif old.status = 'invited' and new.status in ('accepted', 'open', 'cancelled_organizer', 'expired') then
    return new;
  elsif old.status = 'retired' and new.status = 'open' then
    return new;
  elsif old.status = 'pending' and new.status in ('accepted', 'declined', 'cancelled_organizer', 'cancelled', 'expired') then
    return new;
  elsif old.status = 'accepted' and new.status in ('confirmed', 'checked_in', 'cancelled_organizer', 'cancelled_emt', 'cancelled', 'no_show_emt') then
    return new;
  elsif old.status = 'confirmed' and new.status in ('checked_in', 'cancelled_organizer', 'cancelled_emt', 'cancelled', 'no_show_emt') then
    return new;
  elsif old.status = 'checked_in' and new.status = 'completed' then
    return new;
  end if;

  raise exception 'Invalid booking status transition: % -> %', old.status, new.status
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists booking_status_transition on public.bookings;
create trigger booking_status_transition
  before update of status on public.bookings
  for each row execute function public.enforce_booking_status_transition();

-- ── 4. Bookings: coexistence-safe integrity CHECKs ──────────────────────────
-- One-directional (not the spec's biconditionals) so they don't conflict with the
-- broader domain (pending/draft/confirmed/cancelled_* etc.). All hold for existing
-- rows (every live booking is `accepted` with emt_id set, no invitation columns).
alter table public.bookings drop constraint if exists bookings_emt_xor_invited;
alter table public.bookings add constraint bookings_emt_xor_invited
  check (emt_id is null or invited_emt_id is null);                 -- never both at once

alter table public.bookings drop constraint if exists bookings_invited_cols_consistent;
alter table public.bookings add constraint bookings_invited_cols_consistent
  check (
    (invited_emt_id is null and invitation_expires_at is null)      -- not invited: no invitation cols
    or status = 'invited'                                           -- invited: cols allowed
  );

alter table public.bookings drop constraint if exists bookings_invited_requires_cols;
alter table public.bookings add constraint bookings_invited_requires_cols
  check (status <> 'invited' or (invited_emt_id is not null and invitation_expires_at is not null));

alter table public.bookings drop constraint if exists bookings_open_retired_no_emt;
alter table public.bookings add constraint bookings_open_retired_no_emt
  check (status not in ('open', 'retired') or emt_id is null);

-- ── 5. Bookings: partial unique indexes (event-scoped) ──────────────────────
-- Partial or every open/eventless row collides. Scoped to event_id is not null —
-- the slot/invite model is event-centric; eventless legacy rows are exempt.
create unique index if not exists bookings_event_slot_uniq
  on public.bookings (event_id, slot_index)
  where event_id is not null and slot_index is not null;

create unique index if not exists bookings_event_emt_uniq
  on public.bookings (event_id, emt_id)
  where event_id is not null and emt_id is not null;

create unique index if not exists bookings_event_invited_uniq
  on public.bookings (event_id, invited_emt_id)
  where event_id is not null and invited_emt_id is not null;

-- ── 6. Events: headcount + recommended composition ──────────────────────────
-- recommended_staffing is a COMPOSITION over the cert tiers Standby staffs.
-- ⚠ BLS-only: keys are EMR / EMT-B, e.g. {"EMR":1,"EMT-B":2}. Do NOT reintroduce
--   ALS/paramedic (removed 2026-07-22). Actual staffed composition is computed at
--   event time from filled bookings — never denormalized here.
alter table public.events add column if not exists required_medics          int;
alter table public.events add column if not exists recommended_staffing     jsonb;
alter table public.events add column if not exists budget_rate_cents        int;
alter table public.events add column if not exists headcount_override_reason text;
alter table public.events add column if not exists headcount_override_at     timestamptz;
alter table public.events add column if not exists headcount_override_by     uuid references public.profiles (id) on delete set null;

-- ── 7. Audit trail: late-cancel timing ──────────────────────────────────────
-- Reuse booking_state_transitions (0009) rather than a new booking_events table.
-- hours_to_event_start is computed at write time; a late-cancel policy can't be
-- applied retroactively to data that never recorded it.
alter table public.booking_state_transitions add column if not exists hours_to_event_start numeric;

-- ── 8. BACKFILL — PROPOSED SEPARATELY, DO NOT RUN HERE ───────────────────────
-- Assigns slot_index to existing event-attached bookings (trivial: each of the 2
-- events has 1 booking → slot_index 1). Requires its own explicit approval.
--
--   update public.bookings b
--   set slot_index = sub.rn
--   from (
--     select id, row_number() over (partition by event_id order by created_at) as rn
--     from public.bookings where event_id is not null
--   ) sub
--   where b.id = sub.id and b.event_id is not null and b.slot_index is null;
--
-- Eventless bookings keep slot_index = null. No NOT NULL constraint is added on
-- slot_index (legacy eventless rows must stay valid).

-- ── Verification (run AFTER applying; expected results in comments) ──────────
-- 1. emt_id nullable now:
--      select is_nullable from information_schema.columns
--       where table_name='bookings' and column_name='emt_id';                      → YES
-- 2. New columns exist:
--      select count(*) from information_schema.columns where table_name='bookings'
--       and column_name in ('slot_index','invited_emt_id','invited_at',
--       'invitation_expires_at','accepted_at','required_cert_level','rate_cents');  → 7
-- 3. Status domain widened:
--      select true from pg_constraint where conname='bookings_status_check'
--        and pg_get_constraintdef(oid) like '%invited%' and pg_get_constraintdef(oid) like '%retired%'; → t
-- 4. Superset trigger: existing arcs still legal, new arc works, reversal rejected:
--      update bookings set status='invited' where status='open' and id=…;          → ok
--      update bookings set status='accepted' where status='invited' and id=…;       → ok
--      update bookings set status='pending' where status='accepted' and id=…;       → ERROR
-- 5. Partial uniques present:
--      select count(*) from pg_indexes where tablename='bookings'
--       and indexname in ('bookings_event_slot_uniq','bookings_event_emt_uniq',
--       'bookings_event_invited_uniq');                                             → 3
