# Standby — Deep Audit & Improvement Plan

*Audit of callstandby.org (live), competitive research, and monetization analysis — June 11, 2026.*
*Structured so each section can be fed to Claude Code as a work order.*

---

## TL;DR — priority stack

| Priority | Theme | Why |
|---|---|---|
| **P0** | Kill the fabricated trust layer | Legal exposure (FTC fake-reviews rule) + instant credibility loss with the exact buyers you want |
| **P0** | Fix dead ends (footer, stubs, ghost routes, hanging states) | "Broken windows" — each one tells a visitor the product isn't real |
| **P1** | Split signed-out vs signed-in nav; make Events the app home | Your instinct was right — one hybrid nav serves nobody |
| **P2** | Assessment flow upgrades + wire the assess → staff loop | The assessment is your differentiator; it currently dead-ends |
| **P3** | UI polish vs your own design system | You're violating your own "Raw Operational Clarity" rules in ~6 places |
| **Strategy** | Pick a revenue model — current copy forecloses all of them | "No markup, free platform" is written into the landing page |

---

## Status — 2026-07-21 · all code work orders complete

| § | Work order | Status |
|---|---|---|
| §1 | Kill the fabricated trust layer | ✅ Shipped — honest trust blocks, "Sample profiles" banners, monogram avatars, no invented stats |
| §2 | Dead ends & broken windows | ✅ Shipped — honest footer, `/results` sample-report fallback, `/marketplace` 301, per-route metadata on every page, profile ⊇ card, all CTAs wired |
| §3 | Nav split + auth | ✅ Shipped — marketing vs app nav by role, Sign in everywhere, protected routes in proxy, post-auth routing by role |
| §4 | Assessment moat (4.1–4.8) | ✅ Shipped — staff-this-event loop, save + events container, venue autocomplete + auto hospital distance, weather auto-pull, guideline citations, print-to-PDF export, per-event version history, "multi-factor risk model" language |
| §5 | Personnel marketplace | ✅ Shipped — live filter counts, `/for-emts` founding-medic page, verification badges, booking request → EMT accept flow, availability calendar, honest empty states. (Actual medic recruiting = ongoing, non-code) |
| §6 | Monetization | ✅ Copy shipped — buyer-side commission + Premier "coming soon"; billing build deliberately deferred. **Repriced 2026-07-21: EMR $15–18 · EMT-B $18–22; paramedic tier removed** (BLS supply only — engine caps at EMT-B, HIGH/CRITICAL reports carry an ALS-coordination advisory) |
| §7 | UI polish | ✅ Shipped — emoji → line icons, monograms, footer split (marketing vs app chrome), severity tokens, mono data values, button verb unified to "Request coverage", focus states verified, hydration fix |
| — | Beyond this doc | Security/abuse pass (2026-07-20/21): per-IP rate limiting, per-user DB insert caps, security headers, error boundaries, open-redirect hardening, magic-link cooldown |

**Remaining items are non-code:** ~10 organizer conversations to validate Premier
willingness-to-pay, founding-medic recruiting in one metro, counsel review of Terms/Privacy.

---

## 1. P0 — The fabricated trust layer (do this before any polish)

This is the hard truth section. The site currently presents:

- **Fake testimonials with real company names**: "Sarah Chen, VP Operations, LiveNation Events" — Live Nation is a real company (and, ironically, a real client of your competitor ParaDocs). Fabricated quotes attributed to named employees of real companies is false-endorsement/trademark territory on top of being deceptive.
- **Fake stats**: "340+ certified EMTs", "2,500+ events assessed", "98% first-submission AHJ approval", "trusted by 2,000+ event organizers" (Personnel page says 2,000 organizers; landing says 2,500 events; Personnel grid actually renders **9** profiles). Internally inconsistent fabricated numbers are the worst version — a skeptical buyer finds the contradiction in 30 seconds.
- **Fake supply**: EMT profiles built from Unsplash stock faces with invented ratings ("4.9 (127)") and review counts.
- **Aspirational enterprise claims**: FAQ promises "on-premises deployment options and dedicated data residency" — for a product whose Events page says "coming next phase."

**Why this is urgent, not cosmetic:**

1. **It's illegal once you're doing commerce.** The FTC's Consumer Reviews and Testimonials Rule (16 CFR Part 465, effective Oct 2024, still in force as of June 2026) bans fake testimonials and fake reviews with civil penalties up to **$51,744 per violation**. Every fake testimonial and every fake EMT review count is a violation surface.
2. **Your buyers are professionally skeptical.** Event safety officers, medical directors, and AHJs evaluate claims for a living. The "98% AHJ approval rate" claim is checkable by any AHJ — and they talk to each other.
3. **It's a safety-critical product.** Trust is the entire product. You cannot bootstrap it with fiction.

**Replace with honest early-stage trust (this works — founders underrate it):**

- "Built on NAEMSP mass-gathering medicine guidelines" (true, methodologically defensible, and impressive to the right buyer)
- A real pilot-program CTA: "We're onboarding our first cohort of organizers and EMTs in [region]. Founding users get X." Scarcity beats fake scale.
- Team section with real credentials (Cornell engineering founders building with EMS advisors — name the advisors when you have them)
- Real counts, even small ones, in mono/tabular style: `12 assessments run this month` reads more credible than `2,500+`
- "License verified against state EMS registry" badges — only once you actually verify (NY: NYS DOH EMS; most states have lookup APIs or public registries)
- Methodology page: show the risk factors, weights rationale, and guideline citations. "Defensible" is your word — defend it publicly.

---

## 2. P0 — Dead ends & broken windows

| Location | Problem | Fix |
|---|---|---|
| Nav → `/events` | Public nav item lands on "Events dashboard — coming next phase." | Remove from signed-out nav (see §3). If kept for signed-in, build the minimal version first |
| Nav → `/schedule` | "Coming Soon" stub in primary nav | Same treatment |
| Footer "Product" links | EMT Marketplace, Compliance Reports, Staffing Config **all link to `/assess`** | Point to real routes (`/personnel`) or cut the links |
| Footer "Company" + "Resources" | About, Team, Careers, Docs, API Reference, Support, Terms — **all `href="#"`** | Cut everything that doesn't exist. A 3-link honest footer beats a 14-link fake one. Terms + Privacy you actually need (you're collecting auth + event data via Supabase) — write real ones |
| Footer social icons | Three `#` placeholder icons | Remove until accounts exist |
| `/results` direct visit | Hangs on "Generating report…" forever with no assessment in session | Empty state per your own design system: "No assessment in progress. Start one." + CTA → `/assess` |
| `/marketplace` | Dead/empty route (renamed to `/personnel`) | 301 redirect to `/personnel` |
| `/emt/[id]` profile | Card shows `$85/hr` + rating; profile page shows **neither** — no rate, no reviews, no cert detail | Profile must be a superset of the card. Rate, cert level + issuing state, verification status, event history, availability |
| Page titles | `/events`, `/schedule`, `/emt/1` all share the generic homepage `<title>`; one shared meta description site-wide | Per-route metadata via Next.js `generateMetadata` — also an SEO fix |
| "Request This EMT" / "Save Report" | Known non-functional buttons | Wire them or remove them; a primary-styled button that does nothing is the single fastest credibility killer. Also: per design system, action names persist through the flow — "Request This EMT" should be "Request staffing" if that's the flow name |

---

## 3. P1 — Navigation & IA: split marketing from app

Your instinct in the prompt was exactly right, and it's the standard pattern (Linear, Stripe, every serious SaaS): **signed-out visitors get a marketing nav; signed-in users get an app nav.** One hybrid nav serves nobody — right now a first-time visitor sees five app-ish tabs (two of which are stubs) and **no Sign in button at all**. The only auth entry on the entire site is the "I'm an EMT" link buried mid-hero.

### Signed-out (marketing) nav
```
[Standby logo]   How it works   Pricing   For EMTs   |   Sign in   [Start assessment]
```
- `How it works` → anchor sections on landing (assess → staff → document loop)
- `Pricing` → the existing pricing section (rewritten per §6)
- `For EMTs` → dedicated supply-side page: posted-rate model, payment terms, coverage/insurance story, sign-up CTA. You have a two-sided business with zero supply-side marketing surface.
- `Start assessment` stays the red primary CTA — letting visitors run an assessment before auth is your best growth loop. Gate at the *save/report* step, not the start.
- Drop `System Online` from marketing nav (decorative there = AI-pattern). Keep it inside the app where it means something.

### Signed-in (app) nav
```
[Standby logo]   Events   New assessment   Personnel   Schedule   |   System Online   [account menu]
```
- **Events becomes the app's home.** An Event is the natural container object: assessment + risk report + staffing roster + schedule + AHJ docs live under it. Right now an assessment is an orphan — you generate a report and it belongs to nothing.
- EMTs see a different app nav: `Dashboard   My shifts   My profile   Availability`.
- Auth-gate `/events` and `/schedule` properly (middleware redirect to `/auth?next=…` — you already have the `next` param pattern).

### Auth
- `/auth` with role picker is fine; add **Sign in** to every nav state.
- Post-signup routing by role: organizer → Events (empty state: "No events yet. Create your first event to run a risk assessment."), EMT → profile completion with a progress meter (cert upload → rate → radius → availability).

---

## 4. P2 — Assessment: deepen the moat

The 5-step flow with the live preview rail (score updating, factors filling in, `STB-000000` ID, `AWAITING DATA`) is genuinely good — it's the most on-brand screen you have. Upgrades, in order of value:

1. **Wire the loop: assessment → staffing.** The results page should have one primary action: "Staff this event" → `/personnel` pre-filtered to the recommended config (2 AEMT, 3 paramedic, within X mi of venue, available on date). This is the whole product thesis in one click, and today it doesn't exist.
2. **Save/resume + report persistence** (Supabase). An organizer who loses a 5-step form to a refresh doesn't come back. Auto-save per step; assessments list under the Event.
3. **Venue autocomplete** (Google Places / Mapbox) → auto-compute trauma-center proximity (you're asking users to know "8.2 mi" — compute it; CMS Provider of Services / state trauma registry data) and feed venue type.
4. **Weather auto-pull** for date + location (Open-Meteo/NWS is free) instead of self-reported exposure — Step 3 becomes a confirmation, not a quiz.
5. **Citations in the output.** Every staffing ratio line should reference its basis (NAEMSP mass-gathering position statements, event-medicine literature). This is what "defensible" means to an AHJ, and no incumbent's quote PDF does it.
6. **PDF export** of the AHJ report (the landing page already advertises this — it must exist).
7. **Versioning/audit trail**: attendance estimate changes → re-run → report v2 with a diff. Defensibility = paper trail. Cheap to build, very hard for an agency quote to match.
8. **Language check**: be careful with "AI-powered" claims around medical decisions. "Multi-factor risk model calibrated to event-medicine guidelines, reviewed by a medical director" sells *better* to this buyer than "AI". Keep the existing medical-director disclaimer.

---

## 5. P2 — Personnel marketplace

- Filter rail with live counts is the right pattern — keep.
- **Replace the 9 fake profiles** with a real supply strategy: seed one metro (Ithaca/Tompkins or Phoenix — you have networks in both), recruit 15–25 real EMTs with a "founding medic" pitch (keep 100% of posted rate, profile badge, first pick of shifts).
- **Verification as the product**: "License verified · NY DOH · exp 03/2027" on every card. This is the one thing Craigslist/Facebook groups (the real current alternative for small events) can't do.
- Booking request flow: request → EMT accepts → confirmation + calendar entry, all email/SMS-notified. Even fully manual behind the scenes at first ("concierge MVP") — the UI just needs to not lie about it.
- Availability calendar per EMT (feeds `/schedule` later).
- Empty-search state: "No paramedics within 25 mi of this venue yet — join the waitlist / expand radius" rather than a blank grid.

---

## 6. Strategy — monetization (pick one, then make the copy honest)

**The current landing page forecloses revenue**: "Standby is free to use… you pay your EMT directly at their posted rate — no markup, no agency overhead." That's three promises (free platform, direct pay, no markup) that eliminate the three standard revenue models. Adjacent gig-health marketplaces (ShiftKey — $2B valuation, ShiftMed — $200M raise, Nursa) all message "no agency markup" while **charging facility-side platform fees on completed shifts**. "EMTs keep 100% of their posted rate" and "organizers pay a transparent service fee" are compatible statements.

### Option A — Organizer-side booking fee (the ShiftKey/Nursa pattern)
10–20% service fee on top of the EMT's posted rate, shown as a line item at booking. EMT keeps 100% of posted rate (preserves supply-side pitch). Typical labor-marketplace take rates run 10–25%, scaling with how much work the platform does (vetting, payments, insurance, guarantee).
- *Pro*: scales with GMV; standard; investors understand it.
- *Con*: **leakage** — organizer and EMT meet once, then book direct next time. Staffing marketplaces bleed here unless the platform holds something they can't replicate (see C). Requires payments infra (Stripe Connect) and real liquidity first.

### Option B — Monetize the compliance layer (SaaS on your differentiator)
Assessment free as the growth loop → **paid AHJ-ready report** (~$49–$199/event by size) or organizer subscription (multi-event dashboard, versioned reports, post-event incident documentation). Marketplace stays free on both sides to maximize liquidity.
- *Pro*: monetizes the thing competitors don't have and that **can't be disintermediated** — the EMT can go direct; the defensible document can't. Zero marketplace liquidity required to earn dollar one. Insurance-premium savings give willingness-to-pay.
- *Con*: smaller per-transaction revenue early; per-event WTP needs validation with ~10 organizer conversations.

### Option C — Managed/assured tier (the ParaDocs counter)
Self-serve stays cheap; "Standby Assured" premium tier adds what incumbents win on: backup-EMT guarantee, platform malpractice/liability umbrella (ParaDocs leads with "backed by our own malpractice policy"), 24/7 event-day support line. Priced at a meaningfully higher take (25%+) justified by the added work — this is also your leakage defense, because the guarantee + insurance only exist on-platform.
- *Pro*: directly answers "why not just call ParaDocs?"; insurance is a moat.
- *Con*: heaviest ops + real underwriting cost; not a month-one move.

**My take**: B now (it's honest today, funds you, and strengthens the moat), A layered in when one metro has real liquidity, C at scale. Sequencing matters more than the choice — but **rewrite the pricing section now** so no current promise has to be walked back later: keep the three rate cards (genuinely useful market-rate content), change the headline from "Pay for the EMT. Not the platform." to something that prices the *coverage outcome*, and say "EMTs keep 100% of their posted rate" instead of "no markup."

---

## 7. P3 — UI polish vs. your own design system

Violations of "Raw Operational Clarity" found on the live site:

1. **Emoji as icons** on the Event Intelligence card (🎵 🏃 🏢 ⚽) — explicitly on your anti-pattern list. Replace with line icons or mono text glyphs.
2. **Stock-photo avatars** on Personnel cards — beyond the trust issue, photographic headshots fight the dispatch-console aesthetic. Monogram blocks (you already use `KJ`/`MR` style on the landing page) are more on-brand *and* honest.
3. **Footer inconsistency**: marketing footer (4-column) on `/`, bare `STANDBY v1.0` strip on inner pages. Pick the app-chrome footer for app pages, marketing footer for marketing pages — consistent within each context (follows from §3 split).
4. **Risk severity colors**: landing page mixes "High/Medium/Low" chips with brand colors in places — confirm the severity ramp is its own token set (your skill file flags this as undecided; decide it, document it).
5. **Data-as-mono sweep**: spot-check `8.2 mi`, `2.3%`, `74/100`, rates, and the pricing numbers for `font-mono tabular-nums` — several hero-card values appear to inherit the sans face.
6. **Button name persistence**: "Request This EMT" (profile) vs "Request Staffing" (results page, per earlier work) vs toast copy — unify to one verb phrase across the flow.
7. **Focus states**: verify the 2px sharp outline on nav links, filter checkboxes, and the assess form steps — V0-derived components routinely ship `focus:outline-none`.
8. Known: nested-button hydration bug (`SheetTrigger` wrapping `Button`) — confirm Radix vs Base UI before fixing; per repo memory this is already queued.

---

## 8. Competitive snapshot

| Player | Model | What they do well (steal this) | Where Standby wins |
|---|---|---|---|
| **ParaDocs** (NYC, since 2011, 2,500+ pros, 30+ cities) | Full-service agency, quote-based | Real trust artifacts: client logo wall (MLB, UFC, WWE, Live Nation), awards row, "backed by our own malpractice policy", 24/7 phone, named CEO | Self-serve + instant. Their CTA is "Request a Quote" → sales call. Yours is a risk score in 4 minutes with transparent rates |
| **CrowdRx** (since 1989, GMR-affiliated) | Agency for mega-events (MSG, US Open, Yankee Stadium) | Permitting expertise as a service — validates that AHJ paperwork is a real pain point worth paying for | They serve 50k-person events; the 200–5,000-person event (your 9 profiles' actual market) gets agency minimums or nothing |
| **Regional agencies** (EMS Unlimited, FIRE EMS, EMSS, AMR Event Medical) | Local full-service | Local AHJ relationships | Fragmented, phone-and-PDF workflows, zero pricing transparency |
| **Gig-health platforms** (ShiftKey, ShiftMed, Nursa) | Facility-side-fee shift marketplaces | The monetization playbook (§6A); credential-verification UX; "post shift → bids" mechanics | None of them touch events or carry a risk-assessment layer — but any could pivot in. Speed matters |
| **Status quo for small events** | Facebook groups, Craigslist, volunteer squads, "my cousin's an EMT" | Free | Verification, documentation, defensibility — the things that matter when something goes wrong |

**Positioning line that falls out of this research**: incumbents sell *staff by the hour after a sales call*; Standby sells *defensible coverage in minutes*. The assessment isn't a feature on top of the marketplace — it's the reason the marketplace gets chosen.

---

## 9. Suggested execution order (maps to Claude Code work orders)

1. **Week 1 — Truth pass** (§1, §2): strip fake content, fix footer/dead routes/empty states, per-page metadata, honest early-stage trust blocks. Mostly copy + small components; biggest credibility ROI per hour of any item here.
2. **Week 1–2 — Nav split** (§3): signed-out vs signed-in nav, Sign in entry, auth-gate stubs, role-based post-auth routing.
3. **Week 2–3 — Loop wiring** (§4.1, §4.2, §5): save/resume assessments, Events as container, "Staff this event" → pre-filtered Personnel, working booking request (concierge backend is fine).
4. **Week 3–4 — Polish pass** (§7) + pricing-section rewrite (§6).
5. **Parallel, non-code**: 10 organizer conversations to validate Option B willingness-to-pay; recruit founding-medic cohort in one metro.

---

## Sources

- FTC fake reviews/testimonials rule: [FTC final rule announcement](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials) · [16 CFR Part 465 (current)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465) · [FTC Q&A](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers)
- Competitors: [ParaDocs](https://www.paradocsmedical.com/) · [CrowdRx](https://crowdrx.org/) · [AMR Event Medical](https://www.amr.net/services/event-medical) · [EMS Unlimited](https://ems-unlimited.com/services/special-event-staffing-emergency-management/) · [FIRE EMS](https://fireems.org/services/event-paramedics-emts-southern-california/) · [EMSS](https://www.4emss.com/)
- Gig-health marketplace models: [ShiftKey $300M raise / $2B valuation](https://news.crunchbase.com/health-wellness-biotech/employment-shiftkey-fundraise/) · [ShiftMed $200M raise](https://techcrunch.com/2023/02/06/shiftmed-nursing-shortage-200-million/) · [Nursa pricing model](https://nursa.com/facility)
- Take-rate theory: [Tidemark — Marketplace Take Rates](https://www.tidemarkcap.com/vskp-chapter/marketplace-take-rates) · [a16z — 13 Metrics for Marketplaces](https://a16z.com/13-metrics-for-marketplace-companies/) · [a16z — Marketplaces in the Age of AI](https://a16z.com/marketplaces-in-the-age-of-ai-take-two-graveyard-to-greenfield/)
- Nav/UX patterns: [Pencil & Paper — SaaS Navigation UX](https://www.pencilandpaper.io/articles/ux-pattern-analysis-navigation) · [Eleken — UX navigation patterns](https://www.eleken.co/blog-posts/ux-navigation-design)
- Mass-gathering medicine grounding: [SALEM tool (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8508246/) · [Mass-gathering risk assessment protocol (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6591856/)
