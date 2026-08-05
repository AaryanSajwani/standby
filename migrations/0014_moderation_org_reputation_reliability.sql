-- ───────────────────────────────────────────────────────────────────────────
-- 0014 · Organizer public reputation + windowed reliability  (PR B follow-up)
--
-- Two of the remaining deferred PR B pieces need a schema change:
--   • #6 Public organizer reputation page — a browsing medic must be able to read
--     the organizer's NAME (profiles.full_name) and their published medic→organizer
--     reviews before accepting an open slot. Reviews are already public when
--     published; the organizer's name is not (profiles is owner-read + verified-EMT
--     / booking-participant only). This adds a scoped public-read for the names of
--     users who are the SUBJECT of a published review (covers organizers; harmless
--     for EMTs, already public).
--   • #7 Reliability windowing — emt_reliability_stats exposed only ALL-TIME
--     late-cancel / no-show counts. The plan wants a 90-day late-cancel and a
--     365-day no-show window. This recreates the view with the two windowed
--     columns added (still aggregate-only + definer-rights + public — see 0010's
--     rules, which this obeys).
--
-- #5 (report-a-review moderation) and #8 (cancelled_emt / no_show_emt actions)
-- need NO schema change: review_reports + its policies exist (0010), moderation is
-- a service-role action, and the negative terminal transitions are already legal in
-- the 0009 trigger + state machine. #9 (open-claim acceptance email) is app-only.
--
-- ⚠ NOT YET AUTO-APPLIED. Ships WITH the app code that reads the new columns /
-- relies on the organizer-name read. Idempotent — safe to re-run.
-- ───────────────────────────────────────────────────────────────────────────

-- ── 1. Public read of a review SUBJECT's name (organizer reputation) ─────────
-- Scoped exactly like verified_emt_names_public_read: exposes profiles rows only
-- for users who are the subject of at least one PUBLISHED review. profiles holds
-- no PII beyond full_name + role (auth.users emails are NEVER copied here — see
-- CLAUDE.md), so this is safe. Additive/permissive: it only widens SELECT.
drop policy if exists "review_subjects_public_read" on public.profiles;
create policy "review_subjects_public_read" on public.profiles for select
  using (
    exists (
      select 1 from public.reviews r
      where r.subject_user_id = profiles.id
        and r.status = 'published'
    )
  );

-- ── 2. Windowed reliability view ─────────────────────────────────────────────
-- Recreate emt_reliability_stats with the same all-time columns PLUS a 90-day
-- late-cancel and 365-day no-show window (referenced off the shift's event_date).
-- Same invariants as 0010: security_invoker = OFF (definer rights, so the public
-- reliability card shows a TRUE GLOBAL signal, not participant-only rows), SELECT
-- list is STRICTLY emt_id + non-identifying aggregate COUNTS (no organizer id,
-- rates, notes, dates, or any row-level PII), granted to anon + authenticated.
-- 🚫 Do NOT add a non-aggregate or PII column here (see 0010's warning).
drop view if exists public.emt_reliability_stats;
create view public.emt_reliability_stats
with (security_invoker = off) as
select
  b.emt_id                                                              as emt_id,
  count(*) filter (where b.status = 'completed')                        as completed_count,
  count(*) filter (where b.status in ('completed','no_show_emt','cancelled_emt')) as committed_count,
  count(*) filter (where b.status = 'no_show_emt')                      as no_show_count,
  count(*) filter (where b.status = 'cancelled_emt')                    as late_cancel_count,
  count(ci.id) filter (where ci.phase = 'check_in')                     as check_in_count,
  -- Windowed (the plan's rolling windows), referenced off the shift date:
  count(*) filter (
    where b.status = 'cancelled_emt' and b.event_date >= current_date - 90
  )                                                                     as late_cancel_90d,
  count(*) filter (
    where b.status = 'no_show_emt' and b.event_date >= current_date - 365
  )                                                                     as no_show_365d
from public.bookings b
left join public.check_ins ci on ci.booking_id = b.id
where b.emt_id is not null
group by b.emt_id;

grant select on public.emt_reliability_stats to anon, authenticated;

-- ── Verification (run after applying; expected results in comments) ──────────
-- 1. Organizer-name read policy exists:
--      select policyname from pg_policies
--       where schemaname='public' and tablename='profiles'
--         and policyname='review_subjects_public_read';                          → 1 row
-- 2. View has the two new windowed columns:
--      select column_name from information_schema.columns
--       where table_name='emt_reliability_stats'
--         and column_name in ('late_cancel_90d','no_show_365d');                 → 2 rows
-- 3. View still runs + is publicly readable (definer, aggregate-only):
--      select count(*) from emt_reliability_stats;                               → runs
