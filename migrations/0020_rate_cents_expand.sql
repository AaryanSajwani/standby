-- ───────────────────────────────────────────────────────────────────────────
-- 0020 · Money → integer cents (EXPAND phase) — rate_cents becomes the rate field
--
-- ⚠ PROPOSAL — NOT APPLIED. Reviewable per migrations/README.md. Do not run
--   without explicit approval.
--
-- Model decision (2026-08-10): rate_cents is THE single booking rate field
-- (integer cents) — it holds the posted/offered rate while open/invited, then the
-- accepting medic's snapshotted rate once filled (fill already writes it). The
-- legacy dollars `offered_rate` is retired in a later CONTRACT migration (0021)
-- AFTER this expand + the code switch are deployed and stable.
--
-- This expand migration is additive + reversible:
--   1. Backfill rate_cents from offered_rate (×100) for existing rows.
--   2. A rate_cents sanity CHECK mirroring offered_rate's 1–500 (→ 100–50000¢).
--   3. A BEFORE INSERT sync trigger: derive whichever rate field is missing from
--      the other. Old code (writes offered_rate) keeps rate_cents populated; new
--      code (writes rate_cents) still satisfies offered_rate NOT NULL and keeps it
--      readable for any not-yet-deployed reader. Deliberately INSERT-only — fill
--      sets rate_cents and unassign NULLs it on UPDATE, and both must be respected
--      (a coalesce on UPDATE would re-derive rate_cents from offered_rate and
--      clobber the unassign null).
--
-- offered_rate stays NOT NULL through the expand window (the trigger fills it).
-- Nothing here drops a column — 0021 (contract) does that once code is stable.
-- ───────────────────────────────────────────────────────────────────────────

-- 1. Backfill (4 rows at time of writing; all rate_cents null, offered_rate=35).
update public.bookings
set rate_cents = round(offered_rate * 100)
where rate_cents is null and offered_rate is not null;

-- 2. rate_cents sanity — $1–$500 in cents, mirroring bookings_offered_rate_sane.
alter table public.bookings drop constraint if exists bookings_rate_cents_sane;
alter table public.bookings add constraint bookings_rate_cents_sane
  check (rate_cents is null or (rate_cents >= 100 and rate_cents <= 50000));

-- 3. BEFORE INSERT sync (transition safety net; INSERT only — see header).
create or replace function public.sync_booking_rate()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.rate_cents is null and new.offered_rate is not null then
    new.rate_cents := round(new.offered_rate * 100);
  elsif new.offered_rate is null and new.rate_cents is not null then
    new.offered_rate := round(new.rate_cents / 100.0);
  end if;
  return new;
end;
$$;

drop trigger if exists booking_rate_sync on public.bookings;
create trigger booking_rate_sync
  before insert on public.bookings
  for each row execute function public.sync_booking_rate();

-- ── Verification (run after applying) ────────────────────────────────────────
-- 1. No row left unconverted:
--      select count(*) from public.bookings where rate_cents is null and offered_rate is not null; → 0
-- 2. Backfill matches:
--      select count(*) from public.bookings where rate_cents <> round(offered_rate*100);           → 0
-- 3. Trigger present + INSERT-only:
--      select tgtype from pg_trigger where tgname='booking_rate_sync';  -- BEFORE INSERT
-- 4. Sanity check rejects out-of-band cents (on a scratch insert): rate_cents=99 → ERROR.
