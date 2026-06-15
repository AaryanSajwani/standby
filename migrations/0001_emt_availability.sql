-- ───────────────────────────────────────────────────────────────────────────
-- 0001 · EMT availability calendar  (STANDBY-IMPROVEMENTS §5)
--
-- Per-EMT available dates, so /schedule and the marketplace can show real
-- availability instead of a single boolean. Additive and non-breaking: nothing
-- in the app reads this table until the availability UI is wired (see
-- migrations/README.md → "Wiring plan").
--
-- Run in the Supabase SQL editor. Follows the repo's RLS + least-privilege
-- conventions (see CLAUDE.md → "Dangerous Areas" and the auth skill).
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.emt_availability (
  id          uuid primary key default gen_random_uuid(),
  emt_id      uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  created_at  timestamptz not null default now(),
  unique (emt_id, date)
);

create index if not exists emt_availability_emt_id_idx on public.emt_availability (emt_id);
create index if not exists emt_availability_date_idx   on public.emt_availability (date);

alter table public.emt_availability enable row level security;

-- Public read: anyone may see the available dates of a VERIFIED EMT (marketplace,
-- profile, schedule). Mirrors the public-read policy on emt_profiles.
drop policy if exists "emt_availability public read (verified)" on public.emt_availability;
create policy "emt_availability public read (verified)"
  on public.emt_availability for select
  using (
    exists (
      select 1 from public.emt_profiles p
      where p.user_id = emt_availability.emt_id and p.verified = true
    )
  );

-- Owners manage only their own availability.
drop policy if exists "emt_availability owner read" on public.emt_availability;
create policy "emt_availability owner read"
  on public.emt_availability for select
  using (auth.uid() = emt_id);

drop policy if exists "emt_availability owner insert" on public.emt_availability;
create policy "emt_availability owner insert"
  on public.emt_availability for insert
  with check (auth.uid() = emt_id);

drop policy if exists "emt_availability owner delete" on public.emt_availability;
create policy "emt_availability owner delete"
  on public.emt_availability for delete
  using (auth.uid() = emt_id);
