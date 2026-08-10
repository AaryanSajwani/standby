-- ───────────────────────────────────────────────────────────────────────────
-- 0017 · Open-shifts split counts — counts-only invited aggregate
--
-- ⚠ PROPOSAL — NOT APPLIED. Reviewable per migrations/README.md. Do not run
--   without explicit approval.
--
-- WHY: the open-shifts board wants to show each event's split — "1 open ·
--   2 awaiting reply" — so a medic applying to a mostly-held event knows their
--   odds (staffing-slots skill → "EMT open-shifts page"). A medic can see `open`
--   slots (0012) and their OWN `invited` row (0016), but RLS deliberately hides
--   OTHER medics' invitations (test-15 leak protection). So the "awaiting reply"
--   count cannot be computed client-side. This SECURITY DEFINER function returns
--   that count and NOTHING else — no invited_emt_id, no medic identity, just an
--   integer per event.
--
-- SAFETY:
--   • Counts only. The projection is (event_id, invited_count) — it is impossible
--     to recover who was invited. Satisfies staffing-slots test-10 / test-15.
--   • Scoped to events that ALSO expose a board-visible `open` slot to the caller,
--     so it reveals nothing about events the medic isn't already looking at.
--   • Excludes the caller's own events (organizer_id <> auth.uid()).
--   • search_path pinned; EXECUTE revoked from public, granted to authenticated.
--   • No table grants, no new policies, read-only.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.open_slot_invited_counts()
returns table (event_id uuid, invited_count integer)
language sql
security definer
set search_path = public, pg_temp
as $$
  select b.event_id, count(*)::int as invited_count
  from public.bookings b
  where b.status = 'invited'
    and b.event_id is not null
    and b.organizer_id <> auth.uid()
    -- only for events that also expose a board-visible open slot to this caller,
    -- so the count is context the medic already sees an open position for.
    and exists (
      select 1
      from public.bookings o
      where o.event_id = b.event_id
        and o.status = 'open'
        and o.organizer_id <> auth.uid()
    )
  group by b.event_id;
$$;

revoke all on function public.open_slot_invited_counts() from public;
-- Supabase default privileges auto-grant EXECUTE to anon/authenticated/service_role
-- on new public functions; `revoke from public` does NOT touch those named roles,
-- so deny anon explicitly (defense-in-depth — anon has no auth.uid() and would get
-- zero rows anyway, but the board is only ever called by an authenticated medic).
revoke execute on function public.open_slot_invited_counts() from anon;
grant execute on function public.open_slot_invited_counts() to authenticated;

-- ── Verification (run after applying) ────────────────────────────────────────
-- 1. Function is SECURITY DEFINER with a pinned search_path:
--      select prosecdef, proconfig from pg_proc
--       where proname = 'open_slot_invited_counts';                 → t, {search_path=public,pg_temp}
-- 2. Projection is counts-only (no invited_emt_id / medic id column):
--      select pg_get_function_result('public.open_slot_invited_counts'::regproc);
--                                                                    → TABLE(event_id uuid, invited_count integer)
-- 3. anon cannot execute; authenticated can:
--      select has_function_privilege('anon', 'public.open_slot_invited_counts()', 'execute');          → f
--      select has_function_privilege('authenticated', 'public.open_slot_invited_counts()', 'execute'); → t
