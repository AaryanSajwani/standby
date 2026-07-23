-- ───────────────────────────────────────────────────────────────────────────
-- 0007 · Pre-launch hardening  (2026-07-23 security audit)
--
-- Four independent sections; run all of it in the Supabase SQL editor.
-- Idempotent — safe to re-run.
--
--   1. certifications bucket: private + owner-folder storage policies,
--      tracked in the repo instead of living only in the dashboard
--   2. bookings: allowed status transitions enforced by trigger
--   3. bookings / emt_profiles: sanity bounds on client-supplied numbers
--   4. booking_notifications: one email per (booking, event) — dedupe table
--      the /api/notifications/booking route claims before sending
-- ───────────────────────────────────────────────────────────────────────────

-- ── 1. Certifications storage: private bucket, owner-folder access ──────────
-- Cert documents are credential PII. The bucket must not be public, and each
-- user may only touch objects inside their own auth.uid() folder (the app
-- uploads to `${userId}/cert_<ts>.<ext>`). If policies with these names were
-- already created in the dashboard, the drop/create below replaces them with
-- this canonical, reviewable version.
update storage.buckets set public = false where id = 'certifications';

drop policy if exists "certifications_owner_insert" on storage.objects;
create policy "certifications_owner_insert" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'certifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "certifications_owner_select" on storage.objects;
create policy "certifications_owner_select" on storage.objects for select
  to authenticated
  using (
    bucket_id = 'certifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "certifications_owner_update" on storage.objects;
create policy "certifications_owner_update" on storage.objects for update
  to authenticated
  using (
    bucket_id = 'certifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'certifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "certifications_owner_delete" on storage.objects;
create policy "certifications_owner_delete" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'certifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ⚠ After running, check for PRE-EXISTING policies on storage.objects that
-- also grant access to this bucket under other names (they would widen access
-- beyond the four above — drop any that aren't in this file):
--   select policyname, cmd from pg_policies
--   where schemaname = 'storage' and tablename = 'objects'
--     and (qual like '%certifications%' or with_check like '%certifications%');

-- ── 2. Bookings: enforce legal status transitions ────────────────────────────
-- Column grants already restrict clients to updating `status` only, and RLS
-- restricts rows to the assigned EMT — but nothing stopped declined→accepted
-- or accepted→pending flips. Legal transitions:
--   pending  → accepted | declined     (the EMT decides)
--   accepted → cancelled               (the EMT backs out of a confirmed shift)
-- Everything else (including reviving declined/cancelled) is rejected.
create or replace function public.enforce_booking_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new; -- no-op update, allow
  end if;
  if old.status = 'pending' and new.status in ('accepted', 'declined') then
    return new;
  end if;
  if old.status = 'accepted' and new.status = 'cancelled' then
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

-- ── 3. Sanity bounds on client-supplied numbers ──────────────────────────────
-- The UI supplies sensible values, but a hostile client speaking raw PostgREST
-- could insert offered_rate = 2147483647 and have it render in the EMT's
-- dashboard, earnings sum, and notification emails. Bounds are generous
-- multiples of anything the product allows (posted rates are $20–40/hr).
--
-- If any ALTER fails with existing rows violating the constraint, inspect first:
--   select id, offered_rate, duration_hours, expected_attendance from public.bookings
--   where offered_rate not between 1 and 500
--      or duration_hours not between 0.5 and 72
--      or expected_attendance not between 1 and 1000000;
alter table public.bookings drop constraint if exists bookings_offered_rate_sane;
alter table public.bookings add constraint bookings_offered_rate_sane
  check (offered_rate between 1 and 500);

alter table public.bookings drop constraint if exists bookings_duration_sane;
alter table public.bookings add constraint bookings_duration_sane
  check (duration_hours between 0.5 and 72);

alter table public.bookings drop constraint if exists bookings_attendance_sane;
alter table public.bookings add constraint bookings_attendance_sane
  check (expected_attendance between 1 and 1000000);

alter table public.emt_profiles drop constraint if exists emt_profiles_rate_sane;
alter table public.emt_profiles add constraint emt_profiles_rate_sane
  check (hourly_rate between 1 and 500);

alter table public.emt_profiles drop constraint if exists emt_profiles_radius_sane;
alter table public.emt_profiles add constraint emt_profiles_radius_sane
  check (service_radius_miles between 1 and 500);

-- ── 4. Notification dedupe: one email per (booking, event) ──────────────────
-- The notification route claims a row here immediately before sending; the
-- primary key makes the claim race-safe, so a participant re-POSTing the same
-- {bookingId, event} can no longer fire unlimited duplicate emails (Resend
-- cost + inbox spam). Rows are immutable: no update/delete policies.
create table if not exists public.booking_notifications (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  event      text not null check (event in ('requested', 'accepted', 'declined')),
  sent_by    uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (booking_id, event)
);

alter table public.booking_notifications enable row level security;

drop policy if exists "participant_insert" on public.booking_notifications;
create policy "participant_insert" on public.booking_notifications for insert
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.organizer_id = auth.uid() or b.emt_id = auth.uid())
    )
  );

drop policy if exists "participant_select" on public.booking_notifications;
create policy "participant_select" on public.booking_notifications for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.organizer_id = auth.uid() or b.emt_id = auth.uid())
    )
  );

-- ── Verification (run after applying) ───────────────────────────────────────
-- 1. Bucket is private with exactly the four owner policies:
--      select public from storage.buckets where id = 'certifications';  → false
--      select policyname, cmd from pg_policies
--      where schemaname = 'storage' and tablename = 'objects'
--        and policyname like 'certifications_owner_%';                  → 4 rows
-- 2. Transition guard:
--      update bookings set status = 'accepted' where status = 'declined' ...
--      → ERROR: Invalid booking status transition: declined -> accepted
-- 3. Bounds:
--      insert a booking with offered_rate = 99999 → check violation
-- 4. Dedupe:
--      trigger the same booking email twice → second POST returns
--      { sent: false, reason: "already_notified" }
