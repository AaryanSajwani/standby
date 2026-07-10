-- ───────────────────────────────────────────────────────────────────────────
-- 0003 · Race-safe unique event name per organizer  (STANDBY-IMPROVEMENTS §4.2)
--
-- lib/events.ts findOrCreateEvent() does a find-then-insert, which is NOT
-- race-safe: two near-simultaneous calls for the same new name (double-click, or
-- Save Report + a fast cold booking) each see "no match" and insert, producing
-- duplicate event rows for one real event.
--
-- This unique index is the backstop. The index expression MUST equal the helper's
-- normalizeEventName():  (name ?? "").trim().toLowerCase()  →  lower(trim(name)).
-- If normalizeEventName ever changes (e.g. collapsing internal whitespace or
-- stripping punctuation), this expression has to change in lockstep or the index
-- stops matching what the app dedupes on.
--
-- DESIGNED TO BE NON-BREAKING — but only if no duplicates exist yet. Creating a
-- unique index FAILS if two rows already collide under lower(trim(name)). Run the
-- pre-flight check below first; resolve any dupes before creating the index.
--
-- Run AFTER 0002. Idempotent (create ... if not exists).
-- ───────────────────────────────────────────────────────────────────────────

-- ── Pre-flight: must return ZERO rows before the index will build ────────────
-- select organizer_id, lower(trim(name)) as norm_name, count(*)
-- from public.events
-- group by organizer_id, lower(trim(name))
-- having count(*) > 1;

create unique index if not exists events_organizer_norm_name_uniq
  on public.events (organizer_id, lower(trim(name)));

-- ── Post-apply verification (what you asked to run) ──────────────────────────
-- select indexname, indexdef
-- from pg_indexes
-- where tablename = 'events' and indexname = 'events_organizer_norm_name_uniq';
--
-- Expected indexdef (Postgres normalizes the expression on storage):
--   CREATE UNIQUE INDEX events_organizer_norm_name_uniq ON public.events
--   USING btree (organizer_id, lower(btrim(name)))
-- NOTE: Postgres renders trim() as btrim() and may wrap the expression in
-- parentheses — lower(btrim(name)) is the same thing as lower(trim(name)).
