import Link from "next/link"

export const metadata = {
  title: "Privacy Policy — Standby",
  description: "What data Standby collects, how we use it, and the controls you have over it.",
}

// NOTE: Honest starting template describing Standby's actual data flows (Supabase
// auth + Postgres, Google OAuth / email magic link, Vercel hosting). Have counsel
// review and tailor to your jurisdiction before relying on it.
const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. Scope",
    body: [
      "This Privacy Policy explains what information Standby (“we”, “us”) collects when you use the Service, how we use it, who we share it with, and the choices you have.",
    ],
  },
  {
    heading: "2. Information we collect",
    body: [
      "Account information: when you sign in with Google or an email magic link, we receive your email address and, where available, your name. We store your selected role (organizer or EMT).",
      "Event and assessment data: details you enter to run a risk assessment (such as event type, expected attendance, venue conditions, dates, and on-site resources) and any assessments or reports you save.",
      "EMT profile and credential data: for EMTs, the certification level, service area, rate, specializations, and licensure details (such as license number, state, and expiry) you submit during onboarding. Credential fields are stored privately and are never exposed on public marketplace pages.",
      "Booking data: coverage requests exchanged between organizers and EMTs, including event details and status.",
      "Usage data: basic technical information (such as log and device data) generated when you use the Service.",
    ],
  },
  {
    heading: "3. How we use information",
    body: [
      "To provide and operate the Service — authenticate you, generate risk assessments and reports, surface matching personnel, and process coverage requests.",
      "To verify EMT credentials before a profile is published, to maintain safety and integrity, to communicate with you about your account and requests, and to comply with legal obligations.",
    ],
  },
  {
    heading: "4. How we share information",
    body: [
      "With other users as needed for the Service: an EMT’s public profile (excluding private credential fields) is visible to organizers; when you send a coverage request, the relevant event details are shared with the EMT you contact.",
      "With service providers who process data on our behalf under contract — including Supabase (authentication and database), Vercel (hosting), and Google (sign-in). These providers may only use the data to provide their services to us.",
      "For legal reasons, where required to comply with law or protect rights and safety. We do not sell your personal information.",
    ],
  },
  {
    heading: "5. Data retention",
    body: [
      "We keep your information for as long as your account is active or as needed to provide the Service, then for a reasonable period as required to comply with legal obligations, resolve disputes, and enforce agreements.",
    ],
  },
  {
    heading: "6. Your rights and choices",
    body: [
      "You can access and update much of your information from within the Service. You may request a copy of your data, or request that we delete it, by contacting us. We will honor applicable data rights under the laws that apply to you.",
    ],
  },
  {
    heading: "7. Security",
    body: [
      "We protect your data with encryption in transit and at rest and with row-level access controls so users can only reach data they are authorized to see. No method of transmission or storage is perfectly secure, but we work to protect your information.",
    ],
  },
  {
    heading: "8. Children",
    body: [
      "The Service is intended for users 18 and older and is not directed to children. We do not knowingly collect personal information from children under 18.",
    ],
  },
  {
    heading: "9. Changes and contact",
    body: [
      "We may update this Policy; material changes will be reflected by updating the effective date below. Questions or data requests can be sent to privacy@callstandby.org.",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16 lg:py-20">
        <header className="flex flex-col gap-3 pb-10 border-b border-border">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Legal</span>
          <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="font-mono text-xs text-muted-foreground">Effective June 14, 2026</p>
        </header>

        <div className="flex flex-col gap-10 py-10">
          {SECTIONS.map(({ heading, body }) => (
            <section key={heading} className="flex flex-col gap-3">
              <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">{heading}</h2>
              {body.map((p, i) => (
                <p key={i} className="text-foreground/80 leading-relaxed">{p}</p>
              ))}
            </section>
          ))}
        </div>

        <div className="border-t border-border pt-6">
          <Link href="/terms" className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            Read our Terms of Use →
          </Link>
        </div>
      </div>
    </main>
  )
}
