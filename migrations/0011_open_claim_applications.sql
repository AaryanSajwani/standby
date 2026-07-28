-- ───────────────────────────────────────────────────────────────────────────
-- 0011 · Open-claim applications  (PR A — the organizer-approved open path)
--
-- Adds the SECOND booking entry path alongside the shipped direct-request flow.
-- Product decision (2026-07-27): SUPPORT BOTH.
--   • DIRECT-REQUEST (already live): organizer picks a verified EMT → `pending`
--     booking → EMT accepts|declines. Unchanged by this migration.
--   • OPEN-CLAIM, ORGANIZER-APPROVED (new): organizer posts an `open` slot with no
--     EMT → verified medics REQUEST to fill it (rows in booking_applications, so
--     MANY can apply to one slot) → the organizer accepts ONE, which sets the
--     booking's emt_id, moves it open → accepted, and rejects the siblings.
--
-- Companions (pure, unit-tested — pnpm test):
--   lib/bookings/state-machine.ts  — open → accepted is ORGANIZER-initiated
--   lib/bookings/applications.ts   — application lifecycle + planAcceptance()
--
-- ⚠ NOT YET APPLIED. Depends on 0009 (the `open` status value + superset
-- transition trigger that already permits open → accepted). Apply 0009 then 0011
-- together with the PR A open-claim app code. Idempotent — safe to re-run.
--
--   1. bookings: a sibling INSERT policy so an organizer can post an `open` slot
--      (emt_id null). The existing organizer_insert_own (pending + verified emt)
--      is untouched; permissive policies OR, so both paths coexist.
--   2. booking_applications: a medic's request to fill an open slot. Medic-insert
--      (verified only) + medic-withdraw + parties-read; the organizer's accept/
--      reject is a SERVICE-ROLE server action (it is multi-row + atomic: set
--      booking.emt_id, open → accepted, reject siblings — see planAcceptance()).
-- ───────────────────────────────────────────────────────────────────────────

-- ── 1. Bookings: allow posting an OPEN slot (no EMT yet) ─────────────────────
-- The live organizer_insert_own (0008) requires status='pending' AND a verified
-- emt_id, which correctly gates direct requests but blocks an open slot. Add a
-- SEPARATE permissive INSERT policy for open slots: organizer-owned, status='open',
-- no EMT named, and (if attached to an event) the event must be the organizer's.
-- emt_id stays null until the organizer accepts an applicant (service-role side).
drop policy if exists "organizer_insert_open_slot" on public.bookings;
create policy "organizer_insert_open_slot" on public.bookings for insert
  with check (
    organizer_id = auth.uid()
    and status = 'open'
    and emt_id is null
    and (
      event_id is null
      or exists (
        select 1 from public.events e
        where e.id = event_id and e.organizer_id = auth.uid()
      )
    )
  );

-- ── 2. booking_applications ─────────────────────────────────────────────────
-- One row per (open booking, applying medic). status tracks the request's own
-- lifecycle (applied → accepted|rejected|withdrawn|expired); the booking's status
-- is governed separately by the state machine / 0009 trigger.
create table if not exists public.booking_applications (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  emt_id      uuid not null references auth.users (id) on delete cascade,
  status      text not null default 'applied'
                check (status in ('applied', 'accepted', 'rejected', 'withdrawn', 'expired')),
  message     text check (message is null or char_length(message) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (booking_id, emt_id)   -- a medic applies to a given slot at most once
);

create index if not exists booking_applications_booking_idx
  on public.booking_applications (booking_id, status);
create index if not exists booking_applications_emt_idx
  on public.booking_applications (emt_id, status);

alter table public.booking_applications enable row level security;

-- SELECT: the applying medic sees their own requests; the slot's organizer sees
-- every applicant on their booking. Nobody else.
drop policy if exists "booking_applications visibility" on public.booking_applications;
create policy "booking_applications visibility"
  on public.booking_applications for select
  using (
    emt_id = auth.uid()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_applications.booking_id and b.organizer_id = auth.uid()
    )
  );

-- INSERT: only a VERIFIED medic may apply, only as themselves, only 'applied',
-- and only to a booking that is currently OPEN and not their own event. Mirrors
-- the verified-EMT requirement the direct-request insert enforces (0008).
drop policy if exists "booking_applications applicant insert" on public.booking_applications;
create policy "booking_applications applicant insert"
  on public.booking_applications for insert
  with check (
    emt_id = auth.uid()
    and status = 'applied'
    and exists (
      select 1 from public.emt_profiles ep
      where ep.user_id = auth.uid() and ep.verified = true
    )
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.status = 'open'
        and b.organizer_id <> auth.uid()
    )
  );

-- UPDATE (client): the ONLY client-side write is the medic withdrawing their own
-- still-open request. The organizer's accept/reject runs service-role side
-- (multi-row atomic). RLS scopes the row to its owner; the guard trigger pins the
-- immutable columns and restricts the client status change to applied → withdrawn.
drop policy if exists "booking_applications applicant update" on public.booking_applications;
create policy "booking_applications applicant update"
  on public.booking_applications for update
  using (emt_id = auth.uid())
  with check (emt_id = auth.uid());
-- (No client INSERT of a decided status, no DELETE — withdrawal is a status change.)

create or replace function public.guard_booking_application_client_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new; -- service role (organizer accept/reject job) — not policed here
  end if;
  if new.booking_id is distinct from old.booking_id
     or new.emt_id  is distinct from old.emt_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Clients may not change immutable application fields (booking/emt/created_at)'
      using errcode = 'check_violation';
  end if;
  if new.status is distinct from old.status then
    -- The only client-initiated status change is a medic withdrawing a live request.
    if not (old.status = 'applied' and new.status = 'withdrawn') then
      raise exception 'Clients may only withdraw an applied request'
        using errcode = 'check_violation';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists booking_applications_client_update_guard on public.booking_applications;
create trigger booking_applications_client_update_guard
  before update on public.booking_applications
  for each row execute function public.guard_booking_application_client_update();

-- ── Verification (run after applying; expected results in comments) ──────────
-- 1. An organizer can post an open slot; the pending path still requires a verified EMT:
--      insert into bookings (organizer_id, status, emt_id) values (auth.uid(), 'open', null);   → ok
--      insert into bookings (organizer_id, status, emt_id) values (auth.uid(), 'open', '<x>');  → violates RLS
-- 2. Only a verified medic may apply, and only to an open slot:
--      insert into booking_applications (booking_id, emt_id) values ('<open booking>', auth.uid());
--        → ok when auth.uid() is a verified EMT and the booking is open; else violates RLS
-- 3. A medic may withdraw but not self-accept, and cannot touch immutable fields:
--      update booking_applications set status='withdrawn' where emt_id=auth.uid();               → ok (applied→withdrawn)
--      update booking_applications set status='accepted'  where emt_id=auth.uid();               → ERROR: Clients may only withdraw an applied request
--      update booking_applications set booking_id='<other>' where emt_id=auth.uid();             → ERROR: Clients may not change immutable application fields
-- 4. The organizer sees every applicant on their own booking; a stranger sees none:
--      select count(*) from booking_applications where booking_id='<my open booking>';           → all applicants (as organizer)
-- 5. Acceptance is service-role only (no client policy sets status='accepted'); the
--    server action applies planAcceptance(): set booking.emt_id, open→accepted, reject siblings.
