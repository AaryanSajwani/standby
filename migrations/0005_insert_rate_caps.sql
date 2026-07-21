-- ───────────────────────────────────────────────────────────────────────────
-- 0005 · Per-user insert caps  (2026-07-20 abuse pass)
--
-- RLS says WHO may insert; nothing yet says HOW MUCH. A hostile authenticated
-- session talking straight to PostgREST can insert unbounded rows into
-- assessments / events / bookings (each within 0004's payload bounds, but
-- unlimited in count). These triggers cap per-user daily inserts at levels a
-- legitimate user cannot reach — the durable backstop behind the per-instance
-- rate limiter in proxy.ts.
--
-- Run in the Supabase SQL editor. Idempotent — safe to re-run.
-- ───────────────────────────────────────────────────────────────────────────

-- One shared trigger function; the cap comes in as a trigger argument.
-- All three tables key inserts by organizer_id + created_at, so one function
-- serves them all. SECURITY DEFINER so the count is not subject to the
-- inserting role's RLS (and stays correct if select policies ever change).
create or replace function public.enforce_daily_insert_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap    integer := tg_argv[0]::integer;
  recent integer;
begin
  execute format(
    'select count(*) from %I.%I where organizer_id = $1 and created_at > now() - interval ''1 day''',
    tg_table_schema, tg_table_name
  )
  into recent
  using new.organizer_id;

  if recent >= cap then
    raise exception 'Daily limit reached for % — try again tomorrow', tg_table_name
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Caps: far above real usage (a busy organizer might save a dozen assessment
-- versions in a day), far below what row-spam needs to be a problem.
drop trigger if exists assessments_daily_cap on public.assessments;
create trigger assessments_daily_cap
  before insert on public.assessments
  for each row execute function public.enforce_daily_insert_cap('100');

drop trigger if exists events_daily_cap on public.events;
create trigger events_daily_cap
  before insert on public.events
  for each row execute function public.enforce_daily_insert_cap('50');

drop trigger if exists bookings_daily_cap on public.bookings;
create trigger bookings_daily_cap
  before insert on public.bookings
  for each row execute function public.enforce_daily_insert_cap('100');

-- Supporting indexes: make the trigger's count cheap AND speed up the app's
-- own list queries (/events and /schedule filter by organizer_id, order by
-- created_at / event_date).
create index if not exists assessments_organizer_created_idx
  on public.assessments (organizer_id, created_at desc);
create index if not exists events_organizer_created_idx
  on public.events (organizer_id, created_at desc);
create index if not exists bookings_organizer_created_idx
  on public.bookings (organizer_id, created_at desc);

-- emt_availability needs no cap here: 0004's date-window constraint plus the
-- unique(emt_id, date) index already bound it to ~731 rows per EMT.

-- ── Verification (run after applying) ───────────────────────────────────────
-- Triggers exist:
--   select event_object_table, trigger_name from information_schema.triggers
--   where trigger_name like '%_daily_cap';
--   → assessments/events/bookings, one row each
--
-- Cap fires (as an authenticated user with 100 assessment rows today):
--   insert 101st → ERROR: Daily limit reached for assessments
