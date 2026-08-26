-- ───────────────────────────────────────────────────────────────────────────
-- 0021 · Money → integer cents (CONTRACT phase) — retire legacy offered_rate
--
-- ⚠ PROPOSAL — apply AFTER the offered_rate-free app code is deployed and stable.
--   Reviewable per migrations/README.md. Dropping a column is irreversible; this
--   is the contract half of the 0020 expand/contract pair.
--
-- Precondition: no live code path reads or writes `offered_rate` (all selects,
-- inserts, and email fallbacks switched to `rate_cents` in the same change that
-- ships this file). If old code that still SELECTs offered_rate is running when
-- this applies, those reads 500 until the deploy settles — so deploy first.
--
-- What this does, in order:
--   1. Redefine set_event_headcount (0019) to copy rate_cents, not offered_rate —
--      the appended-slot INSERT referenced the column being dropped.
--   2. Drop the INSERT sync trigger + function (0020) — nothing derives one rate
--      field from the other anymore; rate_cents is the sole field.
--   3. Backfill any still-null rate_cents from offered_rate (×100). Reopened `open`
--      slots had rate_cents NULLed by unassign but kept offered_rate — this RECOVERS
--      their original organizer-posted rate before the source column disappears.
--   4. rate_cents SET NOT NULL — with unassign no longer nulling it (same change),
--      every booking always carries an integer-cents rate. Run 3 before 4.
--   5. Drop offered_rate + its sanity constraint.
-- ───────────────────────────────────────────────────────────────────────────

-- 1. Redefine set_event_headcount — appended slots copy rate_cents (was offered_rate).
--    Body is identical to 0019 except the two rate references on the append INSERT.
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
          location, expected_attendance, duration_hours, rate_cents, notes, status, slot_index
        ) values (
          v_uid, null, p_event_id, v_template.event_name, v_template.event_type, v_template.event_date, v_template.starts_at,
          v_template.location, v_template.expected_attendance, v_template.duration_hours, v_template.rate_cents, null, 'open', v_max_slot
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

-- 2. Drop the expand-window sync trigger + function (no longer needed).
drop trigger if exists booking_rate_sync on public.bookings;
drop function if exists public.sync_booking_rate();

-- 3. Backfill any still-null rate_cents from offered_rate before the source is gone.
--    (Reopened `open` slots — unassign NULLed rate_cents but kept offered_rate.)
update public.bookings
set rate_cents = round(offered_rate * 100)
where rate_cents is null and offered_rate is not null;

-- 4. rate_cents is now the sole rate field and is always present.
alter table public.bookings alter column rate_cents set not null;

-- 5. Drop the legacy dollars column + its sanity constraint.
alter table public.bookings drop constraint if exists bookings_offered_rate_sane;
alter table public.bookings drop column if exists offered_rate;

-- ── Verification (run after applying) ────────────────────────────────────────
-- 1. Column gone:
--      select 1 from information_schema.columns
--       where table_name='bookings' and column_name='offered_rate';                → 0 rows
-- 2. rate_cents NOT NULL + no nulls remain:
--      select count(*) from public.bookings where rate_cents is null;             → 0
--      select is_nullable from information_schema.columns
--       where table_name='bookings' and column_name='rate_cents';                 → NO
-- 3. Sync trigger + function gone:
--      select 1 from pg_trigger where tgname='booking_rate_sync';                 → 0 rows
--      select 1 from pg_proc where proname='sync_booking_rate';                   → 0 rows
-- 4. set_event_headcount no longer references offered_rate:
--      select position('offered_rate' in prosrc) from pg_proc
--       where proname='set_event_headcount';                                      → 0
-- 5. Append still works: on a scratch event, set_event_headcount(+1) inserts an
--    open slot whose rate_cents equals the template's (not null).
