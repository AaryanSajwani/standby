-- ───────────────────────────────────────────────────────────────────────────
-- 0012 · Open-slot visibility for medics  (PR A — open-claim path, gap fix)
--
-- 0011 added the open-claim WRITE surface (organizer posts an `open` slot; a
-- verified medic inserts a booking_applications row). But bookings SELECT is
-- PARTICIPANT-ONLY (0008): organizer_select_own (organizer_id = auth.uid()) and
-- emt_select_assigned (emt_id = auth.uid()). An open slot has organizer_id = the
-- poster and emt_id = null, so a browsing medic can see NEITHER — which breaks the
-- path in two places:
--   1. the medic can't browse the open-shift board at all, and
--   2. the 0011 "applicant insert" policy's `exists (select 1 from bookings b
--      where b.id = booking_id and b.status = 'open' …)` check runs under the
--      medic's RLS, so with no SELECT visibility that EXISTS is false and the
--      application insert is REJECTED for every medic.
--
-- This migration adds the missing permissive SELECT policy. Permissive policies
-- OR together, so organizers keep seeing only their own rows via
-- organizer_select_own; this ADDITIONALLY lets a medic read rows that are still
-- `open`. Scope: any authenticated user who has an emt_profiles row (i.e. a
-- medic, verified or pending) may see the board — so a pending medic can browse
-- and is prompted to finish verification, while INSERTing an application still
-- requires verified = true (unchanged, 0011). Organizers cannot browse each
-- other's postings (no emt_profiles row).
--
-- Only `open` rows are exposed. The instant an organizer accepts an applicant the
-- booking moves open → accepted (service-role), so this policy stops matching it
-- and the row reverts to participant-only visibility — a filled/assigned booking
-- is never board-visible.
--
-- ⚠ NOT YET APPLIED. Depends on 0009 (the `open` status) and 0011 (the open-claim
-- write surface). Apply AFTER 0011. Idempotent — safe to re-run.
-- ───────────────────────────────────────────────────────────────────────────

drop policy if exists "emt_select_open_slots" on public.bookings;
create policy "emt_select_open_slots" on public.bookings for select
  using (
    status = 'open'
    and exists (
      select 1 from public.emt_profiles ep where ep.user_id = auth.uid()
    )
  );

-- ── Verification (run after applying; expected results in comments) ──────────
-- 1. The policy exists (permissive, SELECT, on bookings):
--      select count(*) from pg_policies
--       where tablename = 'bookings' and policyname = 'emt_select_open_slots';       → 1
-- 2. As a medic (emt_profiles row present), an open slot posted by ANOTHER
--    organizer is now readable, and the application insert's EXISTS passes:
--      -- signed in as a verified medic; '<open booking>' belongs to another org:
--      select count(*) from bookings where id = '<open booking>' and status = 'open'; → 1
--      insert into booking_applications (booking_id, emt_id)
--        values ('<open booking>', auth.uid());                                       → ok
-- 3. A non-medic (no emt_profiles row) still cannot see open slots they don't own:
--      select count(*) from bookings where status = 'open' and organizer_id <> auth.uid(); → 0
-- 4. Once accepted (open → accepted, service-role), the row leaves the board:
--      -- after acceptance, as a medic who is NOT the assigned emt:
--      select count(*) from bookings where id = '<that booking>';                     → 0
