-- ───────────────────────────────────────────────────────────────────────────
-- 0004 · Security & abuse hardening  (2026-07-10 audit)
--
-- Server-side backstops for things the client already does politely. None of
-- these change behavior for legitimate users; they close abuse paths for a
-- hostile client speaking to PostgREST/Storage directly with a stolen session.
--
-- Run in the Supabase SQL editor. Each section is independent — run all of it.
-- ───────────────────────────────────────────────────────────────────────────

-- ── 1. Cert upload limits (backstop for the client-side check) ──────────────
-- The onboarding form enforces 10 MB + pdf/jpeg/png/webp in JS, but client
-- checks are bypassable. This caps it at the bucket.
update storage.buckets
set file_size_limit    = 10485760, -- 10 MB, keep in sync with CERT_MAX_BYTES
    allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp']
where id = 'certifications';

-- ── 2. Bookings: event_id must be the organizer's own event ─────────────────
-- The insert policy checks organizer_id = auth.uid() but not event_id, so a
-- hostile organizer who learned another organizer's event UUID could attach a
-- booking to it. Impact is low (all roster reads also filter by organizer_id),
-- but cross-tenant references shouldn't exist at all.
drop policy if exists "organizer_insert_own" on public.bookings;
create policy "organizer_insert_own" on public.bookings for insert
  with check (
    organizer_id = auth.uid()
    and status = 'pending'
    and (
      event_id is null
      or exists (
        select 1 from public.events e
        where e.id = event_id and e.organizer_id = auth.uid()
      )
    )
  );

-- ── 3. Assessments: bound the form_data payload ─────────────────────────────
-- form_data is a client-supplied jsonb blob; the real form produces ~2 KB. Cap
-- it so a hostile client can't bloat the DB with megabyte rows.
alter table public.assessments
  drop constraint if exists assessments_form_data_size;
alter table public.assessments
  add constraint assessments_form_data_size
  check (pg_column_size(form_data) < 32768); -- 32 KB, ~16x the real payload

-- ── 4. emt_availability: keep dates within a sane window ────────────────────
-- unique(emt_id, date) already blocks duplicates; this blocks marking every
-- day until 2099 (row spam). Evaluated at write time only, which is fine for
-- a sanity bound.
alter table public.emt_availability
  drop constraint if exists emt_availability_date_sane;
alter table public.emt_availability
  add constraint emt_availability_date_sane
  check (date >= current_date - 1 and date <= current_date + interval '2 years');

-- ── Verification (run after applying; expected results in comments) ─────────
-- Bucket limits took:
--   select id, file_size_limit, allowed_mime_types from storage.buckets
--   where id = 'certifications';
--   → 10485760, {application/pdf,image/jpeg,image/png,image/webp}
--
-- verified is still client-immutable (column grants from the auth skill):
--   select privilege_type, column_name from information_schema.column_privileges
--   where table_name = 'emt_profiles' and grantee = 'authenticated'
--     and column_name = 'verified';
--   → SELECT only, no UPDATE row
--
-- Booking status is the only bookings column authenticated can update:
--   select column_name from information_schema.column_privileges
--   where table_name = 'bookings' and grantee = 'authenticated'
--     and privilege_type = 'UPDATE';
--   → status (single row)
