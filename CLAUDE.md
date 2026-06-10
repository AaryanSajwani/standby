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

## Folder Map

```
app/
  assess/          Multi-step intake form (AssessmentIntakeForm)
  auth/            Sign-in page (Google OAuth + email magic link)
    callback/      OAuth code exchange route handler
  results/         Risk score + staffing recommendation + EMT profile cards
  emt/[id]/        EMT profile detail (mocked, pending Supabase)
  emt-dashboard/   EMT shift request dashboard (protected — requires session)
  personnel/       EMT search and filter UI (renamed from /marketplace)
  schedule/        (in progress)
  events/          (in progress)
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
- **Protected routes**: `/emt-dashboard` — proxy redirects unauthenticated requests
  to `/auth?role=emt&next=/emt-dashboard`
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

**Primitive library — Base UI, not Radix. Always verify before applying fixes.**
`components.json` sets style `base-nova`. All interactive primitives come from `@base-ui/react`.
Radix `asChild`/`Slot` patterns do not exist on these components. Before applying any shadcn
fix sourced from docs or the internet, confirm it targets Base UI.
See `.claude/skills/frontend-debugging/SKILL.md` for the full hydration playbook.

## Self-Improvement Rule

After any correction or bug fix: update this file for project-wide lessons, or the relevant
skill file for component/domain-specific lessons. Rules must be specific and immediately
actionable — no generic advice. One rule per incident, written at the time of the fix.
