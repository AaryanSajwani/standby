-- ───────────────────────────────────────────────────────────────────────────
-- 0019 · Phase 3 headcount — set_event_headcount (atomic revive/retire/append)
--
-- ⚠ PROPOSAL — NOT APPLIED. Reviewable per migrations/README.md. Do not run
--   without explicit approval.
--
-- Sets an event's target headcount and reconciles its position rows to match,
-- atomically (staffing-slots skill → Headcount). This is a SECURITY DEFINER
-- function rather than a service-role route because it is genuinely multi-row —
-- revive + append + retire must all commit together or not at all. It authorizes
-- the organizer in-body via auth.uid() and takes row locks before counting.
--
-- MODEL (decided 2026-08-10 — "bulk on existing template"): positions are created
-- ad-hoc (per-slot duration/rate), so headcount operates on an event that already
-- has ≥1 position; appended slots COPY the newest live position as a template.
--
-- Rules:
--   • current headcount N = live positions (open/invited/accepted/checked_in/
--     completed/no_show_emt). `retired` is parked (not counted, revivable).
--   • INCREASE: revive `retired` slots ascending-index first, THEN append new
--     `open` slots above the current max slot_index. Never fill a gap with a fresh
--     index while a retired slot exists.
--   • DECREASE: floor = N − (open positions). Held (`invited`) and confirmed slots
--     count toward the floor — only `open` positions are retire-able, highest
--     slot_index first. Below the floor → raise BELOW_FLOOR (the organizer must
--     rescind/remove specific positions first, as their own confirmed actions).
--   • Below recommended_staffing total → require p_reason + stamp the override
--     columns. Never hard-locks (inside-24h changes are allowed and recorded).
--   • slot_index is NEVER renumbered; nothing is hard-deleted; every change writes
--     a booking_state_transitions row with hours_to_event_start.
--
-- Errors (map each to real UI copy): OUT_OF_RANGE, EVENT_NOT_FOUND, FORBIDDEN,
--   OVERRIDE_REASON_REQUIRED, BELOW_FLOOR, NO_TEMPLATE.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.set_event_headcount(
  p_event_id uuid,
  p_count int,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events%rowtype;
  v_live int;
  v_open int;
  v_retired int;
  v_floor int;
  v_max_slot int;
  v_rec_total int;
  v_template public.bookings%rowtype;
  v_need int;
  v_revive int := 0;
  v_append int := 0;
  v_remove int := 0;
  v_i int := 0;
  v_hours numeric;
  v_override boolean := false;
  v_new_id uuid;
  v_new_starts timestamptz;
  r record;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if p_count is null or p_count < 0 or p_count > 50 then
    raise exception 'OUT_OF_RANGE' using errcode = '22003';
  end if;

  -- Lock the event; authorize the organizer.
  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_event.organizer_id <> v_uid then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Lock this event's positions so the counts + reconcile are consistent.
  perform 1 from public.bookings where event_id = p_event_id for update;

  select
    count(*) filter (where status in ('open','invited','accepted','checked_in','completed','no_show_emt')),
    count(*) filter (where status = 'open'),
    count(*) filter (where status = 'retired'),
    coalesce(max(slot_index), 0)
  into v_live, v_open, v_retired, v_max_slot
  from public.bookings where event_id = p_event_id;

  v_floor := v_live - v_open;

  -- recommended_staffing total (sum of the composition's integer values), or null.
  if v_event.recommended_staffing is not null then
    select coalesce(sum((value)::int), 0) into v_rec_total
    from jsonb_each_text(v_event.recommended_staffing);
  else
    v_rec_total := null;
  end if;

  -- Below the recommended total needs a reason; stamp the override columns.
  if v_rec_total is not null and p_count < v_rec_total then
    if p_reason is null or btrim(p_reason) = '' then
      raise exception 'OVERRIDE_REASON_REQUIRED' using errcode = 'P0001';
    end if;
    v_override := true;
  end if;

  if p_count > v_live then
    -- ── INCREASE ─────────────────────────────────────────────────────────────
    v_need := p_count - v_live;

    -- Revive retired slots ascending-index first.
    v_revive := least(v_need, v_retired);
    if v_revive > 0 then
      for r in
        select id, starts_at from public.bookings
         where event_id = p_event_id and status = 'retired'
         order by slot_index asc nulls last, created_at asc
         limit v_revive
      loop
        update public.bookings set status = 'open' where id = r.id;
        v_hours := case when r.starts_at is not null then extract(epoch from (r.starts_at - now())) / 3600.0 else null end;
        insert into public.booking_state_transitions(booking_id, from_status, to_status, actor_user_id, actor_role, reason, hours_to_event_start, metadata)
          values (r.id, 'retired', 'open', v_uid, 'organizer', 'Slot revived to increase headcount', v_hours, '{}'::jsonb);
      end loop;
    end if;

    -- Append the remainder above the current max index, copying a template.
    v_append := v_need - v_revive;
    if v_append > 0 then
      select * into v_template from public.bookings
        where event_id = p_event_id
          and status in ('open','invited','accepted','checked_in','completed','no_show_emt')
        order by created_at desc limit 1;
      if v_template.id is null then
        raise exception 'NO_TEMPLATE' using errcode = 'P0001';
      end if;

      while v_i < v_append loop
        v_max_slot := v_max_slot + 1;
        insert into public.bookings(
          organizer_id, emt_id, event_id, event_name, event_type, event_date, starts_at,
          location, expected_attendance, duration_hours, offered_rate, notes, status, slot_index
        ) values (
          v_uid, null, p_event_id, v_template.event_name, v_template.event_type, v_template.event_date, v_template.starts_at,
          v_template.location, v_template.expected_attendance, v_template.duration_hours, v_template.offered_rate, null, 'open', v_max_slot
        )
        returning id, starts_at into v_new_id, v_new_starts;
        v_hours := case when v_new_starts is not null then extract(epoch from (v_new_starts - now())) / 3600.0 else null end;
        insert into public.booking_state_transitions(booking_id, from_status, to_status, actor_user_id, actor_role, reason, hours_to_event_start, metadata)
          values (v_new_id, null, 'open', v_uid, 'organizer', 'Slot added to increase headcount', v_hours, jsonb_build_object('slot_index', v_max_slot));
        v_i := v_i + 1;
      end loop;
    end if;

  elsif p_count < v_live then
    -- ── DECREASE ─────────────────────────────────────────────────────────────
    v_remove := v_live - p_count;
    if v_remove > v_open then
      -- Can only retire `open` positions; the rest are held/confirmed (the floor).
      raise exception 'BELOW_FLOOR' using errcode = 'P0001',
        detail = format('floor=%s live=%s open=%s', v_floor, v_live, v_open);
    end if;
    for r in
      select id, starts_at from public.bookings
       where event_id = p_event_id and status = 'open'
       order by slot_index desc nulls first, created_at desc
       limit v_remove
    loop
      update public.bookings set status = 'retired' where id = r.id;
      v_hours := case when r.starts_at is not null then extract(epoch from (r.starts_at - now())) / 3600.0 else null end;
      insert into public.booking_state_transitions(booking_id, from_status, to_status, actor_user_id, actor_role, reason, hours_to_event_start, metadata)
        values (r.id, 'open', 'retired', v_uid, 'organizer', 'Slot retired to reduce headcount', v_hours, '{}'::jsonb);
    end loop;
  end if;

  -- Stamp the chosen headcount + override columns (override only when below rec).
  update public.events set
    required_medics = p_count,
    headcount_override_reason = case when v_override then p_reason else headcount_override_reason end,
    headcount_override_at     = case when v_override then now()    else headcount_override_at end,
    headcount_override_by     = case when v_override then v_uid    else headcount_override_by end
  where id = p_event_id;

  return jsonb_build_object(
    'target', p_count,
    'previous', v_live,
    'revived', v_revive,
    'appended', v_append,
    'retired_now', case when p_count < v_live then v_live - p_count else 0 end,
    'override', v_override
  );
end;
$$;

revoke all on function public.set_event_headcount(uuid, int, text) from public;
revoke execute on function public.set_event_headcount(uuid, int, text) from anon;
grant execute on function public.set_event_headcount(uuid, int, text) to authenticated;

-- ── Verification (run after applying) ────────────────────────────────────────
-- 1. Definer + pinned search_path; anon denied, authenticated allowed:
--      select prosecdef, proconfig from pg_proc where proname='set_event_headcount';
--      select has_function_privilege('anon','public.set_event_headcount(uuid,int,text)','execute');          → f
--      select has_function_privilege('authenticated','public.set_event_headcount(uuid,int,text)','execute'); → t
-- 2. Increase appends above max index; decrease retires highest open; below-floor
--    and below-recommended-without-reason both raise. (Exercise on a scratch event.)
