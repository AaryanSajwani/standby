-- ───────────────────────────────────────────────────────────────────────────
-- 0013 · Shift start time + self-attest check-in fallback  (PR B follow-up)
--
-- Two deferred PR B pieces need a real shift START TIMESTAMP (bookings carried
-- only event_date, a bare date):
--   • Check-in "opens 60 min before start" time gate.
--   • 30-min self-attest fallback (if the organizer hasn't verified within 30
--     min of start, the medic self-attests with geo + photo + note).
-- Companion pure logic: lib/shifts/timing.ts (unit-tested windows).
--
-- ⚠ NOT YET AUTO-APPLIED. Prepared + reviewable per migrations/README.md. Ships
-- WITH the app code that reads bookings.starts_at (the shift page selects it, so
-- apply this before/with that deploy). Idempotent — safe to re-run.
--
--   1. bookings.starts_at — nullable. NULL = no time gate + no self-attest
--      (exactly the pre-0013 behavior), so existing rows keep working untouched.
--      Set at booking/open-slot creation from the organizer's date + time.
--   2. check-in-attestations Storage bucket — private, owner-folder INSERT+SELECT
--      only (append-only), mirroring the certifications bucket (0004/0007). Holds
--      the self-attest photo referenced by check_ins.photo_path.
-- ───────────────────────────────────────────────────────────────────────────

-- ── 1. Booking start timestamp ───────────────────────────────────────────────
-- Nullable/defaultless: legacy + time-less bookings stay NULL, and the timing
-- helpers treat NULL as "no gate" (check-in allowed anytime, self-attest hidden).
-- No column-grant change is needed: bookings INSERT is governed by the RLS
-- policies only (not column-restricted), and clients may still UPDATE only
-- `status` (0004 grant) — the medic never writes starts_at, and the check-in
-- transition is a service-role write. The organizer sets starts_at at creation.
alter table public.bookings add column if not exists starts_at timestamptz;

-- ── 2. Self-attest photo bucket (private, owner-folder, append-only) ──────────
-- The fallback lets a medic upload a timestamped on-site photo to
-- `${auth.uid()}/checkin_<bookingId>_<ts>.<ext>`; the server records the path on
-- check_ins.photo_path (photo is OPTIONAL — geo + explicit attestation is the
-- minimum). Same discipline as certifications: private bucket, INSERT+SELECT
-- scoped to the owner's own folder, NO update/delete (append-only, so an
-- attestation photo can't be swapped or removed after the fact).
insert into storage.buckets (id, name, public)
values ('check-in-attestations', 'check-in-attestations', false)
on conflict (id) do nothing;

update storage.buckets set public = false where id = 'check-in-attestations';

drop policy if exists "checkin_attest_owner_insert" on storage.objects;
create policy "checkin_attest_owner_insert" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'check-in-attestations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "checkin_attest_owner_select" on storage.objects;
create policy "checkin_attest_owner_select" on storage.objects for select
  to authenticated
  using (
    bucket_id = 'check-in-attestations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Append-only: no update/delete policies (default-deny). Clear any left over.
drop policy if exists "checkin_attest_owner_update" on storage.objects;
drop policy if exists "checkin_attest_owner_delete" on storage.objects;

-- ── Verification (run after applying; expected results in comments) ──────────
-- 1. Column exists + is nullable:
--      select is_nullable from information_schema.columns
--       where table_name = 'bookings' and column_name = 'starts_at';        → YES
-- 2. Bucket is private:
--      select public from storage.buckets where id = 'check-in-attestations'; → false
-- 3. Exactly the two owner-folder policies exist for this bucket:
--      select policyname, cmd from pg_policies
--       where schemaname = 'storage' and tablename = 'objects'
--         and policyname like 'checkin_attest_owner_%';                       → 2 rows (INSERT, SELECT)
