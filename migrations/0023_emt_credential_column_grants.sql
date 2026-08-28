-- ───────────────────────────────────────────────────────────────────────────
-- 0023 · Close the emt_profiles credential-PII read gap (column-level SELECT)
--
-- ⚠ Safe to apply now — the deployed app already reads ONLY the public columns
--   below from a client (credential fields are read exclusively via the service
--   role in the booking routes + /admin/verifications, which bypasses grants).
--
-- THE GAP: emt_profiles had a TABLE-LEVEL `SELECT` grant to anon + authenticated,
-- covering every column including `license_number`, `license_state`,
-- `license_expiry`, and `cert_document_path`. Combined with the
-- `verified_emts_public_read` policy (rows where `verified=true OR auth.uid()=
-- user_id`), ANY authenticated user (the anon key is public) could raw-PostgREST
--   select license_number, license_state, license_expiry, cert_document_path
--   from emt_profiles where verified = true
-- and harvest verified EMTs' credential PII. The code avoided it via the
-- EMT_PUBLIC_COLUMNS allowlist, but the DB did not enforce it — this makes the
-- allowlist real at the grant layer (what CLAUDE.md always described).
--
-- A column-level REVOKE can't override a table-level grant, so we drop the
-- table-level SELECT and re-grant SELECT on ONLY the public/display columns.
-- INSERT is untouched (onboarding writes the credential fields once); UPDATE is
-- already column-scoped and excludes the sensitive fields. The service_role
-- retains full access and is the only reader of the hidden columns.
-- ───────────────────────────────────────────────────────────────────────────

-- 1. Drop the table-wide SELECT (removes read on ALL columns for these roles).
revoke select on public.emt_profiles from anon, authenticated;

-- 2. Re-grant SELECT on ONLY the public columns (== EMT_PUBLIC_COLUMNS in
--    lib/emt.ts). Everything omitted — license_number, license_state,
--    license_expiry, cert_document_path, id, created_at, verification_status,
--    rejection_reason, reviewed_at, reviewed_by — is now unreadable by clients
--    and served only through the service role on gated server surfaces.
grant select (
  user_id,
  cert_level,
  hourly_rate,
  service_radius_miles,
  city,
  state,
  specializations,
  available,
  bio,
  verified
) on public.emt_profiles to anon, authenticated;

-- ── Verification (run after applying) ────────────────────────────────────────
-- 1. Clients can read the 10 public columns and NOTHING else:
--      select privilege_type, string_agg(column_name, ', ' order by column_name)
--      from information_schema.column_privileges
--      where table_name='emt_profiles' and grantee='authenticated' and privilege_type='SELECT'
--      group by privilege_type;
--      → exactly: available, bio, cert_level, city, hourly_rate, service_radius_miles,
--                 specializations, state, user_id, verified
-- 2. A credential column is denied to the client role (proves the fix):
--      set role authenticated;
--      select license_number from public.emt_profiles limit 1;   → ERROR: permission denied for column
--      select cert_level    from public.emt_profiles limit 1;    → ok (0+ rows)
--      reset role;
-- 3. service_role still reads the hidden columns (admin surfaces keep working):
--      set role service_role; select count(license_number) from public.emt_profiles; reset role;  → ok
