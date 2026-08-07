-- ───────────────────────────────────────────────────────────────────────────
-- 0016 · Staffing slots — Phase 5 (partial): medic can see their OWN invitation
--
-- Additive, security-reviewed. The Phase 2 routes already work via the service
-- role, but a medic cannot SELECT their held (`invited`) booking under the 0008
-- policies (emt_select_assigned needs emt_id=me, which is null while invited;
-- emt_select_open_slots needs status='open'). This single permissive SELECT policy
-- lets the invited medic read THEIR invitation so the dashboard can list it.
--
-- No leak (staffing-slots test-15): the predicate is `invited_emt_id = auth.uid()`,
-- so it returns ONLY rows where the caller is the invitee — never another medic's
-- invited_emt_id. Permissive policies OR, so this only GRANTS the invitee access
-- to their own row and cannot restrict any existing flow. No INSERT/UPDATE/DELETE.
--
-- Once resolved the row leaves this policy's scope automatically: on accept, emt_id
-- is set (emt_select_assigned covers it) and invited_emt_id is nulled; on decline/
-- rescind/expiry, invited_emt_id is nulled (the medic correctly loses visibility).
--
-- The rest of Phase 5 (organizer already sees own via organizer_select_own;
-- booking_state_transitions visibility; any event_applications policies) is either
-- already in place or deferred with its own review.
-- ───────────────────────────────────────────────────────────────────────────

drop policy if exists "emt_select_invited" on public.bookings;
create policy "emt_select_invited"
  on public.bookings for select
  using (invited_emt_id = auth.uid());

-- ── Verification (run after applying) ────────────────────────────────────────
-- Policy exists and is SELECT-only:
--   select cmd from pg_policies where tablename='bookings' and policyname='emt_select_invited';  → SELECT
-- Predicate scopes to the invitee (no cross-medic read):
--   select qual from pg_policies where tablename='bookings' and policyname='emt_select_invited';
--     → (invited_emt_id = auth.uid())
