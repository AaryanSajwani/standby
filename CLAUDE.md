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
  results/         Risk score + staffing recommendation + EMT profile cards
  marketplace/     EMT search and filter UI
  schedule/        (in progress)
  events/          (in progress)
  emt/[id]/        EMT profile detail (mocked, pending Supabase)
components/
  assessment/      StepIndicator, AssessmentIntakeForm, per-step form components
  marketplace/     FilterSidebar, SearchHeader, StaffingMarketplace
  results/         RiskScore, StaffingCard, EMTProfileCard, EventSummaryPanel
  layout/          NavBar, ShellWrapper (wraps every page in root layout.tsx)
  landing/         Marketing landing page sections
  ui/              shadcn-generated components (base-nova / Base UI style)
lib/
  supabase.ts      Anon Supabase client — both env vars must be present at startup
  utils.ts         cn() Tailwind merge helper
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

## Dangerous Areas

**Vercel deploys — do not debug Hobby-plan author failures.**
Deploys run through Aaryan's Vercel account. Tanay's commits fail the Hobby-plan
single-author check and show as failed deployments. This is expected — it is not a
code or config bug. Do not investigate or attempt to fix these failures.

**Supabase keys — never expose service keys client-side.**
`lib/supabase.ts` uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Never assign `SUPABASE_SERVICE_ROLE_KEY` or any privileged key to a `NEXT_PUBLIC_` variable.
`.env.local` is gitignored — never commit it.

**Primitive library — Base UI, not Radix. Always verify before applying fixes.**
`components.json` sets style `base-nova`. All interactive primitives come from `@base-ui/react`.
Radix `asChild`/`Slot` patterns do not exist on these components. Before applying any shadcn
fix sourced from docs or the internet, confirm it targets Base UI.
See `.claude/skills/frontend-debugging/SKILL.md` for the full hydration playbook.

## Self-Improvement Rule

After any correction or bug fix: update this file for project-wide lessons, or the relevant
skill file for component/domain-specific lessons. Rules must be specific and immediately
actionable — no generic advice. One rule per incident, written at the time of the fix.
