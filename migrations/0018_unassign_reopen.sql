-- ───────────────────────────────────────────────────────────────────────────
-- 0018 · Phase 3 removal — allow accepted → open (organizer unassigns a medic)
--
-- ⚠ PROPOSAL — NOT APPLIED. Reviewable per migrations/README.md. Do not run
--   without explicit approval.
--
-- WHY: Phase 3 lets an organizer remove a confirmed medic; the slot returns to
--   `open` at the SAME index (staffing-slots skill → Headcount / removal). Neither
--   the 0015 trigger nor lib/bookings/state-machine.ts currently permits
--   accepted → open, so the unassign write would be rejected. This migration adds
--   exactly that one arc to enforce_booking_status_transition().
--
-- The ONLY change vs the 0015 trigger is `open` added to the `accepted` branch.
-- Every other arc is reproduced verbatim so the two stay a strict superset — keep
-- in lockstep with lib/bookings/state-machine.ts (the `accepted → open` arc is
-- added there in the same change). Applying this alone is safe: nothing performs
-- accepted → open until the /api/bookings/unassign route ships.
--
-- A `checked_in` medic still cannot be reopened (no checked_in → open arc) — that
-- is a deliberately different problem (the medic is already on site).
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.enforce_booking_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new; -- no-op update, allow
  end if;

  if old.status = 'draft'  and new.status in ('open', 'pending', 'cancelled_organizer', 'cancelled') then
    return new;
  elsif old.status = 'open'    and new.status in ('accepted', 'invited', 'retired', 'cancelled_organizer', 'cancelled', 'expired') then
    return new;
  elsif old.status = 'invited' and new.status in ('accepted', 'open', 'cancelled_organizer', 'expired') then
    return new;
  elsif old.status = 'retired' and new.status = 'open' then
    return new;
  elsif old.status = 'pending' and new.status in ('accepted', 'declined', 'cancelled_organizer', 'cancelled', 'expired') then
    return new;
  -- NEW (0018): `open` added — organizer unassigns an accepted medic, slot reopens.
  elsif old.status = 'accepted' and new.status in ('open', 'confirmed', 'checked_in', 'cancelled_organizer', 'cancelled_emt', 'cancelled', 'no_show_emt') then
    return new;
  elsif old.status = 'confirmed' and new.status in ('checked_in', 'cancelled_organizer', 'cancelled_emt', 'cancelled', 'no_show_emt') then
    return new;
  elsif old.status = 'checked_in' and new.status = 'completed' then
    return new;
  end if;

  raise exception 'Invalid booking status transition: % -> %', old.status, new.status
    using errcode = 'check_violation';
end;
$$;

-- Trigger itself is unchanged (0015 already created it); the function body above
-- is what the BEFORE UPDATE trigger executes.

-- ── Verification (run after applying) ────────────────────────────────────────
-- 1. accepted → open now legal, reverse still rejected (on a scratch row):
--      update bookings set status='open' where id=… and status='accepted';      → ok
--      update bookings set status='accepted' where id=… and status='completed';  → ERROR
-- 2. checked_in → open still rejected:
--      update bookings set status='open' where id=… and status='checked_in';     → ERROR
