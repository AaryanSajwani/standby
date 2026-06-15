-- ───────────────────────────────────────────────────────────────────────────
-- 0002 · Events as the container object  (STANDBY-IMPROVEMENTS §4.2)
--
-- Today an assessment and a booking are orphans. This makes "Event" the natural
-- container: an assessment, its risk report, its staffing roster (bookings), and
-- its AHJ docs all hang off one event_id.
--
-- DESIGNED TO BE NON-BREAKING: the event_id columns are NULLABLE, so existing
-- rows and existing queries keep working untouched. The app only starts setting /
-- reading event_id once the "Events as container" UI is wired (see README).
--
-- Run AFTER 0001 if you want this phase. Safe to run independently.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.events (
  id                  uuid primary key default gen_random_uuid(),
  organizer_id        uuid not null references auth.users (id) on delete cascade,
  name                text not null,
  event_type          text,
  event_date          date,
  venue_address       text,
  expected_attendance integer,
  created_at          timestamptz not null default now()
);

create index if not exists events_organizer_id_idx on public.events (organizer_id);

alter table public.events enable row level security;

drop policy if exists "events owner all" on public.events;
create policy "events owner all"
  on public.events for all
  using (auth.uid() = organizer_id)
  with check (auth.uid() = organizer_id);

-- Link existing objects to an event (nullable → nothing breaks if unset).
alter table public.assessments add column if not exists event_id uuid references public.events (id) on delete set null;
alter table public.bookings    add column if not exists event_id uuid references public.events (id) on delete set null;

create index if not exists assessments_event_id_idx on public.assessments (event_id);
create index if not exists bookings_event_id_idx    on public.bookings (event_id);
