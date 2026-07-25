// Server-only: privileged Supabase client using the SERVICE ROLE key. It
// bypasses RLS, so it must NEVER be imported from a client component and the
// key must never reach the browser (SUPABASE_SERVICE_ROLE_KEY is not a
// NEXT_PUBLIC_ var — see CLAUDE.md "Supabase keys"). Use it only in server
// route handlers that have ALREADY authorized the caller, to read data the
// caller may not read directly (e.g. participant emails from auth.users).
//
// Returns null when the key isn't configured, so callers degrade gracefully
// (skip the privileged step) instead of crashing — matching the best-effort
// posture of lib/notifications.ts.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
