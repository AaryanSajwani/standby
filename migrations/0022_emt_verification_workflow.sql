-- ───────────────────────────────────────────────────────────────────────────
-- 0022 · EMT credential verification workflow (admin accept / reject)
--
-- ⚠ ADDITIVE + safe to apply in any deploy order (nothing here is read by the
--   currently-deployed app until the /admin/verifications code ships). Reviewable
--   per migrations/README.md.
--
-- `verified boolean` stays THE load-bearing "can act as an EMT" gate that the
-- marketplace + every RLS policy already key on — do NOT drop or replace it. This
-- adds a parallel review STATE so the admin queue can tell pending (never
-- reviewed) apart from rejected (reviewed, denied): both are verified=false.
--
--   accept  → verified=true,  verification_status='accepted'
--   reject  → verified=false, verification_status='rejected' (+reason if notified)
--   revoke  → same as reject, applied to an already-accepted profile
--
-- All writes are SERVICE-ROLE ONLY (the admin route bypasses RLS). Clients are
-- locked out two ways, mirroring how `verified` is protected:
--   • UPDATE: there is no table-level UPDATE grant (only a column-scoped one that
--     lists specific editable columns), so these new columns are simply not
--     client-updatable — nothing to revoke.
--   • INSERT: IS table-level granted (covers future columns), so a column REVOKE
--     wouldn't hold — a RESTRICTIVE insert policy pins a client's row to a clean
--     'pending' state instead (same mechanism as emt_no_self_verify_insert).
-- ───────────────────────────────────────────────────────────────────────────

alter table public.emt_profiles
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending', 'accepted', 'rejected')),
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

-- Backfill: existing verified profiles are already-accepted; the rest stay pending.
update public.emt_profiles set verification_status = 'accepted' where verified = true;

-- A client may only ever create a clean PENDING profile — never self-assign a
-- decided status or plant reason/audit values. RESTRICTIVE ⇒ ANDs with the
-- existing emt_insert_own + emt_no_self_verify_insert checks.
drop policy if exists emt_no_self_accept_insert on public.emt_profiles;
create policy emt_no_self_accept_insert on public.emt_profiles
  as restrictive for insert to anon, authenticated
  with check (
    verification_status = 'pending'
    and rejection_reason is null
    and reviewed_at is null
    and reviewed_by is null
  );

-- ── Verification (run after applying) ────────────────────────────────────────
-- 1. Columns exist + status backfilled to match `verified`:
--      select verification_status, count(*) from public.emt_profiles group by 1;
--      select count(*) from public.emt_profiles where verified = true and verification_status <> 'accepted';   → 0
--      select count(*) from public.emt_profiles where verified = false and verification_status = 'accepted';   → 0
-- 2. Restrictive insert policy present:
--      select policyname, permissive, cmd from pg_policies
--       where tablename='emt_profiles' and policyname='emt_no_self_accept_insert';  → RESTRICTIVE, INSERT
-- 3. New columns are NOT client-updatable (no grant):
--      select privilege_type from information_schema.column_privileges
--       where table_name='emt_profiles' and grantee='authenticated'
--         and column_name='verification_status';   → 0 rows
