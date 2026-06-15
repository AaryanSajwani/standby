# Standby

Two-sided marketplace connecting event organizers with EMTs. Core flow: organizer submits a multi-step risk assessment → engine scores medical exposure → marketplace surfaces matching EMT personnel for booking. Goal: professional event medical coverage, automated.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16, App Router, RSC |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS v4 |
| Components | shadcn `base-nova` style — primitives from **`@base-ui/react`**, not Radix |
| Database | Supabase JS v2 (anon client; data mostly mocked today) |
| Hosting | Vercel (Aaryan's account — see Dangerous Areas) |
| Package manager | pnpm |

## Brand

Logo colors are the palette anchors: navy `#041228` (page background) and red `#F04249`
(primary/accent/risk-high). All colors live in `app/globals.css` as CSS variables — components
must use semantic tokens (`bg-background`, `text-risk-low`, `var(--border)` in SVG/inline
styles), never raw hexes or Tailwind palette colors (`emerald-400`, `amber-500`, …).
Logo assets: `public/standby-logo.png` (full lockup, transparent bg) and
`public/standby-mark.png` (square mark, used in NavBar/footer/CTA via `next/image`).
The NavBar is an inverted light surface — style it with the `--nav*` tokens
(`bg-nav`, `text-nav-foreground`, `text-nav-muted`, `border-nav-border`), and keep it
solid (no translucency) so dark page content doesn't bleed through while scrolling.
Both are generated from the root `StandBy Logo.png` (white bg — source of truth, do not
reference directly in the app).

## Folder Map

```
app/
  assess/          Multi-step intake form — state persists to sessionStorage (survives auth bounce)
  auth/            Sign-in page (Google OAuth + email magic link)
    callback/      OAuth code exchange route handler
  results/         Risk report computed client-side from sessionStorage via lib/assessment.ts;
                   Save Report (auth-gated insert to assessments), Request Staffing (prefill + /personnel?cert=)
  emt/[id]/        EMT profile detail + booking request form (UUID ids = real, numeric = mock)
  emt-dashboard/   EMT booking dashboard — real data, accept/decline, availability toggle (protected)
  personnel/       EMT search/filter UI — verified emt_profiles, mock fallback (force-dynamic)
  schedule/        Upcoming coverage — date-ordered pending/accepted bookings (protected)
  events/          Organizer booking list with statuses (protected)
  for-emts/        Supply-side marketing page (posted-rate model, founding-medic CTA)
  terms/           Terms of Use (starter draft — needs counsel review)
  privacy/         Privacy Policy (starter draft — needs counsel review)
components/
  assessment/      StepIndicator, AssessmentIntakeForm, per-step form components
  marketplace/     FilterSidebar, SearchHeader, StaffingMarketplace
  results/         RiskScore, StaffingCard, EMTProfileCard, EventSummaryPanel
  layout/          NavBar, ShellWrapper (wraps every page in root layout.tsx)
  landing/         Marketing landing page sections
  ui/              shadcn-generated components (base-nova / Base UI style)
lib/
  supabase/
    client.ts      Browser client (createBrowserClient from @supabase/ssr)
    server.ts      Server/RSC client (createServerClient, reads Next.js cookies())
  supabase.ts      Legacy anon client — unused, kept for reference
  assessment.ts    Risk scoring engine, sessionStorage keys, BookingPrefill type
  bookings.ts      BOOKING_COLUMNS allowlist, Booking mapper, date formatting
  emt.ts           CERT_DISPLAY, EMT_PUBLIC_COLUMNS allowlist, joinedFullName
  utils.ts         cn() Tailwind merge helper
proxy.ts           Next.js 16 proxy (session refresh + route protection)
types/
  assessment.ts    AssessmentFormData interface + EMPTY_FORM_DATA constant
hooks/             use-mobile, use-toast (standard shadcn)
pointer-ai-landing-page/  Separate Next.js sub-project, own lockfile, not a workspace
```

## Commands

```bash
pnpm dev        # dev server at localhost:3000
pnpm build      # production build
npm run lint    # ESLint
```

## Auth System

Google OAuth + email magic link via `@supabase/ssr`. No `auth-helpers-nextjs`.

- **Sign-in page**: `/auth?role=emt|organizer&next=/path` — both params are optional
- **Callback**: `/auth/callback` exchanges the OAuth code, sets role on user metadata
  and upserts the `profiles` table (handles OAuth trigger-timing gap)
- **Session refresh**: `proxy.ts` runs on every request; reads/writes cookies via
  the SSR cookie API — do NOT bypass it with the legacy `lib/supabase.ts` client
- **Protected routes**: `/emt-dashboard`, `/onboarding`, `/events` — proxy redirects
  unauthenticated requests to `/auth` with the right `role` and `next` params
- **NavBar**: session-aware client component; shows user name + sign-out when signed in
- **Homepage**: async RSC — checks session and passes `emtHref` to `LandingHero` so
  authenticated users land directly on `/emt-dashboard` instead of `/auth`

### Supabase config required (one-time, in dashboard)

1. **Google provider**: Authentication → Providers → Google → enable, add client ID/secret
2. **Redirect URLs**: Authentication → URL Configuration → add:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)
3. **profiles table**: run the SQL migration in `.claude/skills/auth/migration.sql`

### Next.js 16 proxy convention

In Next.js 16, `middleware.ts` was renamed to `proxy.ts` and the exported function
must be named `proxy` (not `middleware`). The `config.matcher` export works identically.
Do not create `middleware.ts` — it will produce a deprecation warning and may not run.

## Product Conventions (2026-06-14 audit pass)

**Honest trust — no fabricated content (P0, legal).** Never ship fake testimonials, stats,
ratings, review counts, or stock-photo avatars — FTC exposure (16 CFR Part 465) plus instant
credibility loss with safety-critical buyers. Trust = methodology (mass-gathering medicine /
NAEMSP), credential verification, honest early-access framing. Personnel use monogram blocks;
sample data sits behind a "Sample profiles" banner with no trust signals. Frame the engine as a
"multi-factor risk model," not "AI," and keep the medical-director disclaimer. Full rules in the
`ui-conventions` skill → "Trust & honesty".

**Navigation split.** `NavBar` branches on auth + `user_metadata.role`: signed-out → marketing nav
(How it works · Pricing · For EMTs · Sign in · Start assessment, no "System Online"); signed-in →
app nav (organizer: Events · New assessment · Personnel · Schedule; EMT: Dashboard · Personnel).
Every nav link resolves to a real route — no stubs. Post-auth landing: organizer → `/events`,
EMT → `/emt-dashboard`.

**Monetization — two-part, buyer-side (revised 2026-06-14).** (1) *Transactional*: a transparent
**buyer-side** commission — the EMT keeps 100% of their posted rate; Standby's fee is added on top
and shown as its own line at checkout (transparency, not a markup). Keep "EMTs keep 100% of their
posted rate"; never "no markup / no agency overhead." (2) *Standby Premier* (subscription, coming
soon): unlocks the AHJ-ready compliance report, built on the risk engine. Buyer-side now protects
the EMT recruiting promise while supply is the bottleneck; revisit a seller-side take-rate at scale.
**Copy/static only** until billing is decided — no Stripe, no commission-split logic, no Premier
gating, and never mock a checkout with hardcoded dollar amounts. Premier CTA stays disabled/"coming
soon." Full copy rules in the `ui-conventions` skill → "Pricing model."

## Dangerous Areas

**Vercel deploys — repo is private, requires explicit GitHub app access.**
Deploys run through Aaryan's Vercel account connected to a private GitHub repo.
If deployments fail after a push: the fix is in GitHub, not the code.
Aaryan must go to GitHub → Settings → Applications → Vercel → Configure → grant
access to the `standby` repo. Do not attempt to debug failed deploys in code.

**Supabase keys — never expose service keys client-side.**
`lib/supabase/client.ts` and `lib/supabase/server.ts` use only `NEXT_PUBLIC_SUPABASE_URL`
and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never assign `SUPABASE_SERVICE_ROLE_KEY` or any
privileged key to a `NEXT_PUBLIC_` variable. `.env.local` is gitignored — never commit it.

**EMT credential PII — never `select *` on emt_profiles, never fetch license fields client-side.**
`license_number`, `license_state`, `license_expiry`, and `cert_document_path` are written once
during onboarding and must never be read back by any marketplace/profile query. All public
reads of `emt_profiles` go through `EMT_PUBLIC_COLUMNS` in `lib/emt.ts` — an explicit column
list that excludes credential fields. RLS is row-level, not column-level: the public-read
policy exposes every column of verified rows, so the column allowlist in code (plus the
column-level `REVOKE` in the hardening migration) is the defense. The revoke blocks the
anon AND authenticated roles, so if an owner-facing "edit credentials" view is ever needed,
read via a `security definer` RPC that checks `auth.uid()` — never re-grant column select.
`verified` and `created_at` are also client-immutable via column-level update grants —
only the SQL editor / service role can flip `verified`. Reuse this grant pattern on any
new table with privileged columns (e.g. bookings: EMTs may update only `status`).
Full SQL in `.claude/skills/auth/SKILL.md` → "Column-level grants".

**Primitive library — Base UI, not Radix. Always verify before applying fixes.**
`components.json` sets style `base-nova`. All interactive primitives come from `@base-ui/react`.
Radix `asChild`/`Slot` patterns do not exist on these components. Before applying any shadcn
fix sourced from docs or the internet, confirm it targets Base UI.
See `.claude/skills/frontend-debugging/SKILL.md` for the full hydration playbook.

Two verified Base UI v1.5 gotchas (found via browser repro on the /personnel slider):
- `Slider.Root` `onValueChange` delivers a **scalar number** for single-thumb sliders even
  when `value` is passed as a one-element array. Never destructure the callback arg as an
  array (`([v]) => …` throws "number is not iterable" and freezes the slider); use
  `(v) => fn(Array.isArray(v) ? v[0] : v)`.
- Orientation state is emitted as `data-orientation="horizontal|vertical"`, NOT bare
  `data-horizontal`/`data-vertical` attributes. Tailwind variants must be written
  `data-[orientation=horizontal]:…`. slider.tsx is fixed; tabs, button-group, scroll-area,
  toggle-group, and separator still use the stale `data-horizontal:`/`data-vertical:`
  variants and may have invisible orientation-dependent styles.

## Self-Improvement Rule

After any correction or bug fix: update this file for project-wide lessons, or the relevant
skill file for component/domain-specific lessons. Rules must be specific and immediately
actionable — no generic advice. One rule per incident, written at the time of the fix.
