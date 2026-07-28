-- ───────────────────────────────────────────────────────────────────────────
-- 0010 · Verified check-in + double-blind reviews + reliability  (PR B)
--
-- The differentiator: verified attendance and two-sided reputation. Companions:
--   lib/shifts/verification-code.ts  — rotating 6-digit check-in codes (TOTP)
--   lib/reviews/reliability.ts       — Bayesian shrinkage + computed reliability
--   lib/reviews/content-guard.ts     — email/phone rejection + PHI warnings
-- all unit-tested (pnpm test).
--
-- ⚠ NOT YET APPLIED. Prepared + reviewable per migrations/README.md. Depends on
-- 0009 for the richer booking lifecycle (checked_in / completed / *_emt states)
-- and the state-transition trigger. Reviewable independently; apply 0009 first.
--
-- Idempotent — safe to re-run.
--
--   1. shift_verification_secrets — per-booking TOTP secret. Service-role only;
--      the secret NEVER reaches any client (the server returns only the current
--      code + expiry). No client policies at all → default-deny.
--   2. check_ins — verified on-site/self-attest events. Parties read own;
--      service-role writes (after the server validates the code).
--   3. reviews (+ revisions, replies, reports) — double-blind, publish-gated.
--      The blind-window SELECT policy is the crux; verification queries below.
--   4. emt_reliability_stats — a VIEW aggregating computed reliability, so a
--      profile card is one query, not an N+1. (MV upgrade path noted.)
-- ───────────────────────────────────────────────────────────────────────────

-- ── 1. Per-booking check-in secret (service-role only) ───────────────────────
-- The secret backs the rotating code. RLS is ENABLED with NO policies, so no
-- client role (anon/authenticated) can read or write it; only the service role
-- (which bypasses RLS) touches it, server-side. The 6-digit code the medic sees
-- is derived and returned by the server — the secret itself stays here.
create table if not exists public.shift_verification_secrets (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  secret     text not null,
  created_at timestamptz not null default now()
);

alter table public.shift_verification_secrets enable row level security;
-- Intentionally no policies. Do NOT add any — the secret must never be client-readable.

-- ── 2. Check-in events ───────────────────────────────────────────────────────
-- One row per verification event (check-in and check-out). The server writes it
-- after validating the submitted code, so INSERT is service-role only. Geo is
-- best-effort (nullable) — never block check-in on it.
create table if not exists public.check_ins (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid not null references public.bookings (id) on delete cascade,
  actor_role           text not null check (actor_role in ('organizer', 'emt', 'system')),
  method               text not null check (method in ('qr', 'manual', 'fallback', 'admin_override')),
  phase                text not null default 'check_in' check (phase in ('check_in', 'check_out')),
  verification_quality text not null default 'verified'
                         check (verification_quality in ('verified', 'self_attested')),
  verified_at          timestamptz not null default now(),
  latitude             double precision,
  longitude            double precision,
  accuracy_meters      double precision,
  user_agent           text,
  note                 text,
  photo_path           text,             -- Storage path for the fallback self-attest photo
  created_at           timestamptz not null default now()
);

create index if not exists check_ins_booking_id_idx on public.check_ins (booking_id, verified_at);

alter table public.check_ins enable row level security;

-- Parties on the booking may read its check-ins; writes are service-role only.
drop policy if exists "check_ins participant select" on public.check_ins;
create policy "check_ins participant select"
  on public.check_ins for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = check_ins.booking_id
        and (b.organizer_id = auth.uid() or b.emt_id = auth.uid())
    )
  );
-- (No client INSERT/UPDATE/DELETE — the server validates the code then writes.)

-- ── 3. Reviews (double-blind, publish-gated) ─────────────────────────────────
-- One review per (booking, author). Only bookings that reached a verified,
-- terminal-good outcome are reviewable — enforced in the INSERT policy — which
-- structurally eliminates fake reviews. Publication (pending → published) is a
-- SERVICE-ROLE action (both-submitted OR 14-day window close); clients can never
-- self-publish.
create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings (id) on delete cascade,
  author_user_id  uuid not null references auth.users (id) on delete cascade,
  subject_user_id uuid not null references auth.users (id) on delete cascade,
  author_role     text not null check (author_role in ('organizer', 'emt')),
  overall         smallint not null check (overall between 1 and 5),
  subscores       jsonb not null default '{}'::jsonb,
  body            text check (body is null or char_length(body) <= 1000),
  status          text not null default 'pending'
                    check (status in ('pending', 'published', 'under_review', 'removed')),
  submitted_at    timestamptz not null default now(),
  published_at    timestamptz,
  edited_at       timestamptz,
  created_at      timestamptz not null default now(),
  unique (booking_id, author_user_id)
);

create index if not exists reviews_subject_published_idx
  on public.reviews (subject_user_id) where status = 'published';
create index if not exists reviews_booking_idx on public.reviews (booking_id);

alter table public.reviews enable row level security;

-- CRUX — blind-window read policy. A caller may read a review only if it is
-- published (public) OR they authored it. The counterparty's PENDING review is
-- therefore invisible until publication: it is neither published nor authored by
-- the caller. This is the policy the PR B acceptance criterion tests with a
-- DIRECT client query as party A (not via the UI). Verification queries below.
drop policy if exists "reviews read published or own" on public.reviews;
create policy "reviews read published or own"
  on public.reviews for select
  using (status = 'published' or author_user_id = auth.uid());

-- INSERT: you may only create YOUR OWN review, as 'pending', for a booking you
-- are a party to whose shift is verified-complete, with author_role matching
-- your side. Only 'completed' bookings (0009 lifecycle) are reviewable.
drop policy if exists "reviews author insert" on public.reviews;
create policy "reviews author insert"
  on public.reviews for insert
  with check (
    author_user_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.status = 'completed'
        and (
          (author_role = 'organizer' and b.organizer_id = auth.uid() and subject_user_id = b.emt_id)
          or
          (author_role = 'emt' and b.emt_id = auth.uid() and subject_user_id = b.organizer_id)
        )
    )
  );

-- UPDATE: an author may edit their OWN review. The edit-window (24h after
-- publication, then locked) and the rule that clients cannot self-publish are
-- enforced by the trigger below — RLS grants the row, the trigger polices the
-- allowed field/status changes.
drop policy if exists "reviews author update" on public.reviews;
create policy "reviews author update"
  on public.reviews for update
  using (author_user_id = auth.uid())
  with check (author_user_id = auth.uid());

-- Guard: a CLIENT edit may touch ONLY {overall, subscores, body}. Everything that
-- ties the review to a real, verified booking party — subject_user_id, booking_id,
-- author_user_id, author_role — and the lifecycle timestamps (submitted_at,
-- published_at) and status are IMMUTABLE from the client. The RLS UPDATE policy
-- (below) only re-pins author_user_id; PostgreSQL does NOT re-run the INSERT
-- policy's subject/party consistency check on UPDATE, so without this trigger an
-- author could raw-PATCH subject_user_id onto an arbitrary victim (planting a
-- fabricated review on a stranger's profile) or null/future published_at to defeat
-- the 24h edit lock forever. This trigger is the sole barrier — pin every immutable
-- column here. Service-role writes bypass RLS AND skip this guard (auth.uid() is
-- null for the service role); the publication job sets published_at = now()
-- authoritatively and must not trust any client-supplied value.
create or replace function public.guard_review_client_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new; -- service role (publication job / moderation) — not policed here
  end if;
  if new.status is distinct from old.status then
    raise exception 'Clients may not change review status' using errcode = 'check_violation';
  end if;
  -- Freeze the identity + lifecycle columns. A client edit may change only
  -- overall / subscores / body; anything else is a policy violation.
  if new.subject_user_id is distinct from old.subject_user_id
     or new.booking_id     is distinct from old.booking_id
     or new.author_user_id is distinct from old.author_user_id
     or new.author_role    is distinct from old.author_role
     or new.submitted_at   is distinct from old.submitted_at
     or new.published_at   is distinct from old.published_at then
    raise exception 'Clients may not change immutable review fields (subject/booking/author/role/timestamps)'
      using errcode = 'check_violation';
  end if;
  if old.status = 'published'
     and old.published_at is not null
     and now() > old.published_at + interval '24 hours' then
    raise exception 'Review is locked (24h after publication)' using errcode = 'check_violation';
  end if;
  new.edited_at := now();
  return new;
end;
$$;

drop trigger if exists reviews_client_update_guard on public.reviews;
create trigger reviews_client_update_guard
  before update on public.reviews
  for each row execute function public.guard_review_client_update();

-- Edit history (append-only). Written alongside each client edit.
create table if not exists public.review_revisions (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.reviews (id) on delete cascade,
  overall    smallint,
  subscores  jsonb,
  body       text,
  edited_at  timestamptz not null default now()
);
alter table public.review_revisions enable row level security;
-- Readable by the review's author; written service-role side. Published-review
-- history is not public (only the current published version is).
drop policy if exists "review_revisions author select" on public.review_revisions;
create policy "review_revisions author select"
  on public.review_revisions for select
  using (
    exists (
      select 1 from public.reviews r
      where r.id = review_revisions.review_id and r.author_user_id = auth.uid()
    )
  );

-- One reply per review, by the review's SUBJECT (the person reviewed).
create table if not exists public.review_replies (
  id             uuid primary key default gen_random_uuid(),
  review_id      uuid not null unique references public.reviews (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  body           text not null check (char_length(body) <= 1000),
  created_at     timestamptz not null default now(),
  edited_at      timestamptz
);
alter table public.review_replies enable row level security;

-- Replies are visible wherever the parent review is (published), or to their author.
drop policy if exists "review_replies read with parent" on public.review_replies;
create policy "review_replies read with parent"
  on public.review_replies for select
  using (
    author_user_id = auth.uid()
    or exists (
      select 1 from public.reviews r
      where r.id = review_replies.review_id and r.status = 'published'
    )
  );

-- Insert: only the review's SUBJECT may reply, and only to a published review.
drop policy if exists "review_replies subject insert" on public.review_replies;
create policy "review_replies subject insert"
  on public.review_replies for insert
  with check (
    author_user_id = auth.uid()
    and exists (
      select 1 from public.reviews r
      where r.id = review_id
        and r.subject_user_id = auth.uid()
        and r.status = 'published'
    )
  );

drop policy if exists "review_replies author update" on public.review_replies;
create policy "review_replies author update"
  on public.review_replies for update
  using (author_user_id = auth.uid())
  with check (author_user_id = auth.uid());

-- Guard: same immutability logic as reviews. The INSERT policy validates that the
-- reply author is the SUBJECT of a PUBLISHED review; that check does NOT re-run on
-- UPDATE, so without this trigger a subject could raw-PATCH review_id to retarget
-- their reply onto a DIFFERENT published review (one with no reply yet, dodging the
-- unique(review_id) constraint) — content injection under a review they have no
-- relationship to. review_id and author_user_id are immutable from the client; a
-- client edit may touch only body.
create or replace function public.guard_review_reply_client_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new; -- service role — not policed here
  end if;
  if new.review_id      is distinct from old.review_id
     or new.author_user_id is distinct from old.author_user_id then
    raise exception 'Clients may not change immutable reply fields (review_id/author)'
      using errcode = 'check_violation';
  end if;
  new.edited_at := now();
  return new;
end;
$$;

drop trigger if exists review_replies_client_update_guard on public.review_replies;
create trigger review_replies_client_update_guard
  before update on public.review_replies
  for each row execute function public.guard_review_reply_client_update();

-- Reports (moderation). Soft-hide only — never hard-delete (reviews.status flips
-- to 'under_review' then 'removed' service-role side).
create table if not exists public.review_reports (
  id               uuid primary key default gen_random_uuid(),
  review_id        uuid not null references public.reviews (id) on delete cascade,
  reporter_user_id uuid not null references auth.users (id) on delete cascade,
  reason           text not null check (reason in
                     ('phi', 'contact_info', 'harassment', 'inaccurate', 'spam', 'other')),
  description      text check (description is null or char_length(description) <= 1000),
  status           text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at       timestamptz not null default now()
);
alter table public.review_reports enable row level security;

-- A signed-in user may file a report and read the reports they filed. Admin
-- review is service-role side (see the admin route in PR B).
drop policy if exists "review_reports reporter insert" on public.review_reports;
create policy "review_reports reporter insert"
  on public.review_reports for insert
  with check (reporter_user_id = auth.uid());
drop policy if exists "review_reports reporter select" on public.review_reports;
create policy "review_reports reporter select"
  on public.review_reports for select
  using (reporter_user_id = auth.uid());

-- ── 4. Computed reliability view ─────────────────────────────────────────────
-- Aggregate per EMT so a profile card is one indexed query, not an N+1. These are
-- the PUBLIC reliability signals (completion/on-time/late-cancel/no-show),
-- mirroring lib/reviews/reliability.ts. Counts fill in as the 0009 lifecycle is
-- adopted (completed / no_show_emt / cancelled_emt land). Upgrade to a
-- MATERIALIZED VIEW with a scheduled refresh if this ever gets hot.
--
-- ⚠ DEFINER-RIGHTS BY DESIGN (security_invoker = off). bookings + check_ins have
-- PARTICIPANT-ONLY RLS (organizer_id/emt_id = auth.uid()), so a security_invoker
-- view would return EMPTY rows to a non-participant (an anon visitor or a
-- prospective organizer viewing the profile) and PARTIAL, misleading counts to a
-- one-off counterparty — defeating the whole "public reliability card" purpose. To
-- serve a TRUE GLOBAL per-EMT signal to everyone, the view aggregates with the
-- owner's (RLS-bypassing) rights. This is a deliberate, reviewed exception that is
-- safe ONLY because the SELECT list is strictly emt_id + non-identifying aggregate
-- COUNTS — never organizer identity, rates, notes, dates, or any row-level PII.
-- 🚫 DO NOT add a non-aggregate or PII column here; if you need more, move to a
-- service-maintained public reliability TABLE (RLS on, public-read `using (true)`,
-- refreshed on 0009 status transitions) rather than widening this definer view.
-- (Supabase's security_definer_view lint will flag this — it is intentional.)
drop view if exists public.emt_reliability_stats;
create view public.emt_reliability_stats
with (security_invoker = off) as
select
  b.emt_id                                                              as emt_id,
  count(*) filter (where b.status = 'completed')                        as completed_count,
  count(*) filter (where b.status in ('completed','no_show_emt','cancelled_emt')) as committed_count,
  count(*) filter (where b.status = 'no_show_emt')                      as no_show_count,
  count(*) filter (where b.status = 'cancelled_emt')                    as late_cancel_count,
  count(ci.id) filter (where ci.phase = 'check_in')                     as check_in_count
from public.bookings b
left join public.check_ins ci on ci.booking_id = b.id
where b.emt_id is not null
group by b.emt_id;

-- Aggregate-only + definer rights => safe to expose the reliability card publicly.
grant select on public.emt_reliability_stats to anon, authenticated;

-- ── Verification (run after applying; expected results in comments) ──────────
-- 1. Secret table is client-invisible (RLS on, zero policies):
--      select relrowsecurity from pg_class where relname='shift_verification_secrets'; → t
--      select count(*) from pg_policies where tablename='shift_verification_secrets';  → 0
-- 2. Blind-window read — as party A (a normal authenticated client), party B's
--    pending review must be UNREADABLE. With RLS, this SELECT returns 0 rows:
--      -- signed in as organizer A; emt B has a 'pending' review of A:
--      select count(*) from reviews
--        where author_user_id = '<B>' and status = 'pending';                          → 0
--    …and A's own review is visible to A regardless of status:
--      select count(*) from reviews where author_user_id = auth.uid();                 → ≥ its rows
--    …and once status flips to 'published' (service role), both parties see it:
--      select count(*) from reviews where status='published' and subject_user_id=auth.uid(); → ≥1
-- 3. Only 'completed' bookings are reviewable (INSERT policy):
--      insert into reviews(booking_id, author_user_id, subject_user_id, author_role, overall)
--      values ('<non-completed booking>', auth.uid(), '<other>', 'organizer', 5);
--        → new row violates row-level security policy "reviews author insert"
-- 4. Clients cannot self-publish:
--      update reviews set status='published' where author_user_id=auth.uid();
--        → ERROR: Clients may not change review status
-- 4b. Clients cannot retarget a review or defeat the edit lock (immutable columns):
--      update reviews set subject_user_id='<victim>' where author_user_id=auth.uid();
--        → ERROR: Clients may not change immutable review fields
--      update reviews set published_at=null where author_user_id=auth.uid();
--        → ERROR: Clients may not change immutable review fields
--    …and a reply cannot be retargeted onto another review:
--      update review_replies set review_id='<other>' where author_user_id=auth.uid();
--        → ERROR: Clients may not change immutable reply fields
-- 5. Reliability view is definer-rights + publicly readable (GLOBAL counts, no PII):
--      select count(*) from emt_reliability_stats;                                      → runs
--    …and returns the SAME global counts to a non-participant / anon as to a party
--    (definer bypasses the participant-only bookings RLS; only aggregate columns exist).
