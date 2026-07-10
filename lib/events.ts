import type { SupabaseClient } from "@supabase/supabase-js"

// ── Event linkage (STANDBY-IMPROVEMENTS §4.2) ────────────────────────────────
// One canonical normalizer + one find-or-create, shared by every write path
// (results "Save report", booking request) AND the read-side grouping on
// /events. Keeping a single function here is what prevents the casing drift bug:
// previously the roster query matched event_name case-sensitively while the
// version grouping lowercased it, so "Lakeview Festival" and "lakeview festival"
// silently split into two groups / failed to roll up.

/**
 * Canonical normalization for matching free-text event names.
 * MUST be the only place names are normalized — both findOrCreateEvent (write)
 * and the /events version grouping (read) call this so they can never diverge.
 * Display names keep their original casing; only matching is normalized.
 */
export function normalizeEventName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase()
}

export interface EventInput {
  organizerId: string
  name: string
  eventType?: string | null
  eventDate?: string | null
  venueAddress?: string | null
  expectedAttendance?: number | null
}

/**
 * Find the organizer's existing event by trimmed + case-insensitive name, or
 * create one. Returns the event id, or null.
 *
 * Best-effort by design: a null return means the events table is absent/errored,
 * so callers fall back to a null event_id (the pre-0002 behavior) instead of
 * failing the primary assessment/booking insert.
 *
 * Matching is done in JS via normalizeEventName so it is byte-for-byte identical
 * to the read-side grouping — a server-side `.ilike` would diverge on names
 * containing `%`/`_`. Fetching the organizer's events is fine at current scale
 * (few events per organizer); revisit if that stops being true.
 *
 * Race-safe against the events_organizer_norm_name_uniq index (migration 0003).
 * The fast path is lookup-then-insert; if a concurrent caller wins the race, our
 * insert trips the unique index (SQLSTATE 23505) and we recover the winner's row
 * by re-selecting, so the loser still returns the real id instead of null.
 *
 * NOTE: we can't use Supabase `.upsert({ onConflict })` here — PostgREST's
 * on_conflict target accepts column names only, and 0003's index is on the
 * expression lower(trim(name)), which it can't reference. Insert-then-recover is
 * the equivalent for an expression index.
 */
export async function findOrCreateEvent(
  supabase: SupabaseClient,
  input: EventInput,
): Promise<string | null> {
  const target = normalizeEventName(input.name)
  if (!target) return null

  // Fast path: return an already-existing event for this organizer.
  const existingId = await lookupEventId(supabase, input.organizerId, target)
  if (existingId) return existingId

  const { data: created, error: insertErr } = await supabase
    .from("events")
    .insert({
      organizer_id: input.organizerId,
      name: input.name.trim(),
      event_type: input.eventType ?? null,
      event_date: input.eventDate || null,
      venue_address: input.venueAddress || null,
      expected_attendance: input.expectedAttendance ?? null,
    })
    .select("id")
    .single()

  if (!insertErr) return created?.id ?? null

  // Lost the race: a concurrent caller created the event between our lookup and
  // insert, so the unique index rejected ours. Recover their row.
  if (insertErr.code === "23505") {
    const recoveredId = await lookupEventId(supabase, input.organizerId, target)
    if (recoveredId) return recoveredId
    console.error("[events] 23505 on insert but re-select found nothing:", insertErr.message)
    return null
  }

  console.error("[events] create failed:", insertErr.message)
  return null
}

// Find the organizer's event whose name normalizes to `target`. Matching is done
// in JS via normalizeEventName so it stays byte-identical to the read-side
// grouping (a server-side .ilike would diverge on names containing % or _).
async function lookupEventId(
  supabase: SupabaseClient,
  organizerId: string,
  target: string,
): Promise<string | null> {
  const { data: candidates, error } = await supabase
    .from("events")
    .select("id, name")
    .eq("organizer_id", organizerId)

  if (error) {
    console.error("[events] lookup failed:", error.message)
    return null
  }

  const match = (candidates ?? []).find(
    (e) => normalizeEventName(e.name as string) === target,
  )
  return (match?.id as string) ?? null
}
