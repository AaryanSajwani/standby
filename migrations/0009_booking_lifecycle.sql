-- ───────────────────────────────────────────────────────────────────────────
-- 0009 · Booking lifecycle audit trail + event lifecycle columns  (PR A)
--
-- Foundation for the events → bookings → acceptance flow described in
-- standby-build-prompts.md (PR A). Companion to lib/bookings/state-machine.ts,
-- which is the single source of truth for legal transitions and is unit-tested.
--
-- ⚠ NOT YET APPLIED. Prepared + reviewable, per the repo convention
-- (migrations/README.md): master auto-deploys, so table-dependent app code lands
-- only once the migration is run. Sections 1–2 are additive and non-breaking and
-- can be applied any time. Section 3 changes LIVE booking-status enforcement and
-- is coupled to a product decision (see the ⚠ on it) — review before applying.
--
-- Idempotent — safe to re-run.
--
--   1. booking_state_transitions — append-only audit trail (the "who changed
--      this booking to what, and why" log). Additive, non-breaking.
--   2. events — lifecycle columns (starts_at, ends_at, description, status).
--      All nullable / defaulted, so existing rows and queries keep working.
--   3. bookings — widen the status vocabulary + replace the 0007 transition
--      trigger with a SUPERSET that keeps every live transition legal while
--      allowing the richer lifecycle. ⚠ apply with the PR A app changes.
-- ───────────────────────────────────────────────────────────────────────────

-- ── 1. Booking state transition audit trail ─────────────────────────────────
-- One row per status change. Append-only: no UPDATE / DELETE policy, so the
-- trail can't be rewritten. actor_user_id is nullable for system transitions
-- (e.g. expiry). INSERT is service-role only — the server writes the row inside
-- the same transaction as the status change, never the client directly.
create table if not exists public.booking_state_transitions (
  id             uuid primary key default gen_random_uuid(),
  booking_id     uuid not null references public.bookings (id) on delete cascade,
  from_status    text,                       -- null for the initial insert
  to_status      text not null,
  actor_user_id  uuid references auth.users (id) on delete set null, -- null = system
  actor_role     text check (actor_role in ('organizer', 'emt', 'system')),
  reason         text,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists booking_state_transitions_booking_id_idx
  on public.booking_state_transitions (booking_id, created_at);

alter table public.booking_state_transitions enable row level security;

-- SELECT for the two parties on that booking; INSERT service-role only; no
-- UPDATE / DELETE policy anywhere → those default-deny for every client role.
drop policy if exists "bst participant select" on public.booking_state_transitions;
create policy "bst participant select"
  on public.booking_state_transitions for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_state_transitions.booking_id
        and (b.organizer_id = auth.uid() or b.emt_id = auth.uid())
    )
  );
-- (No INSERT/UPDATE/DELETE policies: the service role bypasses RLS to write the
--  trail; every client role is denied by the absence of a permissive policy.)

-- ── 2. Events: lifecycle columns ────────────────────────────────────────────
-- The 0002 events table has (name, event_type, event_date, venue_address,
-- expected_attendance). PR A wants a start/end window, a description, and a
-- lifecycle status. Add them nullable/defaulted so nothing existing breaks; keep
-- event_date / venue_address in place (no rename) for backward compatibility.
alter table public.events add column if not exists starts_at   timestamptz;
alter table public.events add column if not exists ends_at     timestamptz;
alter table public.events add column if not exists description text;
alter table public.events add column if not exists status      text not null default 'draft';

alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check
  check (status in ('draft', 'open', 'filled', 'completed', 'cancelled'));

alter table public.events drop constraint if exists events_time_order;
alter table public.events add constraint events_time_order
  check (ends_at is null or starts_at is null or ends_at >= starts_at);

-- ── 3. Bookings: widen status vocabulary + superset transition trigger ───────
-- ⚠ APPLY WITH PR A APP CODE. This changes what the live bookings.status column
--   accepts and which transitions the DB permits. It is written as a strict
--   SUPERSET of the 0007 rules — every transition the shipped direct-request
--   flow performs (pending→accepted|declined, accepted→cancelled) stays legal —
--   so applying it does not break the current app. It ADDITIONALLY allows the
--   richer open-claim / check-in / completion lifecycle. Whether the product
--   moves to open-claim (open slots medics claim) or stays direct-request is a
--   FOUNDER DECISION; this trigger supports both. The bare legacy value
--   `cancelled` is kept legal alongside the split cancelled_organizer /
--   cancelled_emt so no data migration is forced.

-- If a CHECK constraint pins bookings.status to the old 4 values, widen it.
-- (If none exists, the drop is a no-op and the add installs a permissive one.)
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in (
    'draft', 'open', 'pending', 'accepted', 'confirmed', 'checked_in',
    'completed', 'declined', 'cancelled', 'cancelled_organizer',
    'cancelled_emt', 'no_show_emt', 'expired'
  ));

-- Superset of migration 0007's enforce_booking_status_transition(). Mirrors
-- lib/bookings/state-machine.ts (BOOKING_TRANSITIONS) plus the legacy `cancelled`
-- alias. Keep the two in sync when either changes.
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
  elsif old.status = 'open'    and new.status in ('accepted', 'cancelled_organizer', 'cancelled', 'expired') then
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

-- The 0007 trigger name is reused so this replaces it cleanly.
drop trigger if exists booking_status_transition on public.bookings;
create trigger booking_status_transition
  before update of status on public.bookings
  for each row execute function public.enforce_booking_status_transition();

-- ── Verification (run after applying; expected results in comments) ──────────
-- 1. Audit table + RLS:
--      select relrowsecurity from pg_class where relname = 'booking_state_transitions'; → t
--      select count(*) from pg_policies
--        where tablename = 'booking_state_transitions';                                → 1 (select only)
-- 2. Event columns exist:
--      select column_name from information_schema.columns
--       where table_name = 'events'
--         and column_name in ('starts_at','ends_at','description','status');           → 4 rows
-- 3. Superset trigger keeps live transitions legal and rejects reversals:
--      update bookings set status='accepted' where status='pending' and id=…;          → ok
--      update bookings set status='pending'  where status='accepted' and id=…;          → ERROR
--      update bookings set status='completed' where status='checked_in' and id=…;       → ok
