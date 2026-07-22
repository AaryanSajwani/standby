-- ───────────────────────────────────────────────────────────────────────────
-- 0006 · Booking notification lookup  (2026-07-22 email notifications)
--
-- The /api/notifications/booking route needs participant emails. Emails live
-- in auth.users, which anon/authenticated cannot read — and must NOT be
-- copied onto public.profiles, because the verified-EMT public-read policy
-- would expose every verified medic's email to anyone with the anon key.
--
-- This SECURITY DEFINER function returns the two participants' emails and
-- display names ONLY when the caller is on the booking (organizer or EMT).
-- Run in the Supabase SQL editor. Idempotent — safe to re-run.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.booking_notification_info(p_booking_id uuid)
returns table (
  organizer_email text,
  organizer_name  text,
  emt_email       text,
  emt_name        text
)
language sql
security definer
set search_path = public
as $$
  select
    ou.email::text,
    coalesce(op.full_name, 'An organizer'),
    eu.email::text,
    coalesce(ep.full_name, 'The medic')
  from public.bookings b
  join auth.users ou on ou.id = b.organizer_id
  join auth.users eu on eu.id = b.emt_id
  left join public.profiles op on op.id = b.organizer_id
  left join public.profiles ep on ep.id = b.emt_id
  where b.id = p_booking_id
    and (b.organizer_id = auth.uid() or b.emt_id = auth.uid())
$$;

-- Locked to signed-in callers; the participant check above scopes the rows.
revoke all on function public.booking_notification_info(uuid) from public, anon;
grant execute on function public.booking_notification_info(uuid) to authenticated;

-- ── Verification (run after applying) ───────────────────────────────────────
-- As a booking participant:
--   select * from booking_notification_info('<your booking uuid>');
--   → one row with both emails
-- As anyone else (or with a random uuid): zero rows, never an error.
