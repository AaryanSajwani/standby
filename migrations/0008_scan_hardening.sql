-- ───────────────────────────────────────────────────────────────────────────
-- 0008 · Scan hardening  (2026-07-25 Claude Security scan)
--
-- Closes three findings from the whole-repo scan. Server-side backstops only —
-- none change behavior for a legitimate client. Run all of it in the Supabase
-- SQL editor. Idempotent — safe to re-run.
--
--   1. emt_profiles: `verified` is client-immutable on INSERT too, not just
--      UPDATE — a self-service EMT could raw-POST verified=true and appear as a
--      vetted, bookable medic with fabricated credentials. (F2, HIGH)
--   2. bookings: the INSERT policy must require emt_id to name a currently
--      VERIFIED EMT — otherwise any organizer can file booking requests naming
--      an arbitrary victim (dashboard/inbox spam) and, combined with the
--      notification RPC, harvest verified EMTs' private emails. (F4, MEDIUM /
--      the enabling half of F1, HIGH)
--   3. booking_notification_info: retire the authenticated EXECUTE grant — the
--      notification route now resolves recipient emails with the service role
--      server-side, so no client role should be able to read raw auth.users
--      emails via this RPC. (F1, HIGH)
--
-- ⚠ ORDERING: apply section 3 together with the deploy of the updated
-- app/api/notifications/booking/route.ts (which switches to the service-role
-- lookup). Applied alone, notification emails degrade to a logged skip until
-- the new code ships — the in-app flow stays the source of truth either way.
-- Section 3 also needs SUPABASE_SERVICE_ROLE_KEY set in the server env.
-- ───────────────────────────────────────────────────────────────────────────

-- ── 1. emt_profiles: reject self-verification at INSERT ──────────────────────
-- The auth-skill hardening migration already revokes UPDATE on `verified` (an
-- EMT can't flip it on their own row), but that does NOT cover INSERT — the
-- onboarding payload is built in the browser, so a hostile client could raw-
-- POST a new row with verified=true and appear as a vetted, bookable medic.
-- A RESTRICTIVE insert policy is ANDed with the existing permissive
-- (user_id = auth.uid()) policy, so it blocks verified=true for anon/
-- authenticated regardless of that policy's exact form — and it needs NO code
-- change: the onboarding insert sends verified=false, which passes. Only the
-- service role / SQL editor (which bypass RLS) can ever set verified=true.
alter table public.emt_profiles alter column verified set default false;

drop policy if exists "emt_no_self_verify_insert" on public.emt_profiles;
create policy "emt_no_self_verify_insert" on public.emt_profiles
  as restrictive for insert to anon, authenticated
  with check (verified is not true);

-- ── 2. bookings: INSERT must name a verified EMT ─────────────────────────────
-- organizer_insert_own (migration 0004) constrained organizer_id, status, and
-- event ownership, but placed NO predicate on emt_id — so a hostile client
-- could insert a pending booking naming any user (verified EMTs' user_ids are
-- public via EMT_PUBLIC_COLUMNS). Require emt_id to reference a currently
-- verified emt_profiles row. Legit requests always target a marketplace-listed
-- (hence verified) EMT, so this is invisible to real organizers.
drop policy if exists "organizer_insert_own" on public.bookings;
create policy "organizer_insert_own" on public.bookings for insert
  with check (
    organizer_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.emt_profiles ep
      where ep.user_id = emt_id and ep.verified = true
    )
    and (
      event_id is null
      or exists (
        select 1 from public.events e
        where e.id = event_id and e.organizer_id = auth.uid()
      )
    )
  );

-- ── 3. Retire the authenticated-callable notification-info RPC ───────────────
-- booking_notification_info (migration 0006) is SECURITY DEFINER and returns
-- BOTH participants' raw auth.users emails to any authenticated caller who is a
-- participant on the booking — directly callable via PostgREST, bypassing the
-- /api/notifications/booking route guards. An organizer who books a verified
-- EMT could call it to read that EMT's private email; before section 2, they
-- could name an arbitrary victim. The notification route now resolves recipient
-- emails with the service role (server-side, never returned to the caller), so
-- no client role needs EXECUTE. The function definition is left in place for
-- reference; only the grant is removed.
revoke execute on function public.booking_notification_info(uuid)
  from authenticated, anon, public;

-- ── Verification (run after applying; expected results in comments) ──────────
-- 1. A raw insert with verified=true is rejected (verified=false still works,
--    so real onboarding is unaffected):
--      insert into emt_profiles (user_id, verified, cert_level, hourly_rate,
--        service_radius_miles, city, state)
--      values (auth.uid(), true, 'emt_b', 25, 50, 'Chicago', 'IL');
--      → new row violates row-level security policy "emt_no_self_verify_insert"
--
-- 2. A booking naming a non-verified emt_id is rejected by the policy:
--      insert into bookings (organizer_id, emt_id, status, ...)
--      values (auth.uid(), '<some non-verified user>', 'pending', ...);
--      → new row violates row-level security policy "organizer_insert_own"
--
-- 3. booking_notification_info is no longer client-callable:
--      select has_function_privilege('authenticated',
--        'public.booking_notification_info(uuid)', 'execute');
--      → false
