import Link from "next/link"

export const metadata = {
  title: "Terms of Use — Standby",
  description: "The terms governing your use of the Standby event medical risk and staffing platform.",
}

// NOTE: This is an honest starting template grounded in how Standby actually works
// (Supabase auth + event/assessment data, a two-sided EMT marketplace). It is NOT
// a substitute for legal counsel — have an attorney review before relying on it.
const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. Agreement to these terms",
    body: [
      "These Terms of Use (“Terms”) govern your access to and use of Standby (the “Service”), operated by Standby (“we”, “us”). By creating an account, running an assessment, or otherwise using the Service, you agree to these Terms. If you do not agree, do not use the Service.",
    ],
  },
  {
    heading: "2. What Standby is — and is not",
    body: [
      "Standby is a decision-support tool. It helps event organizers assess medical risk and connect with emergency medical personnel. Standby is not a medical provider, a staffing agency of record, an insurer, or an authority having jurisdiction (AHJ).",
      "Risk scores, staffing configurations, and reports are informational starting points generated from the details you provide and published event-medicine guidance. They are not medical advice and do not replace the judgment of a qualified medical director. You are responsible for having a qualified medical director review and approve any medical coverage plan, and for meeting all applicable laws, permits, and AHJ requirements for your event.",
    ],
  },
  {
    heading: "3. Accounts and roles",
    body: [
      "You may create an account as an event organizer or as an EMT. You must provide accurate information, keep your credentials secure, and are responsible for activity under your account. You must be at least 18 years old to use the Service.",
      "EMTs are responsible for the accuracy of the certification and licensure information they submit, and for maintaining valid, current credentials and any insurance required to provide services.",
    ],
  },
  {
    heading: "4. Personnel listings and verification",
    body: [
      "Standby reviews the credential information EMTs submit before a profile is published. “Verified” indicates that we have performed a review of the information available to us; it is not a guarantee of an individual’s identity, fitness, conduct, or the outcome of any engagement. Organizers should exercise their own due diligence.",
    ],
  },
  {
    heading: "5. Bookings and payment",
    body: [
      "When an organizer requests an EMT and the EMT accepts, the resulting engagement is a direct agreement between the organizer and the EMT. EMTs set and keep 100% of their posted hourly rate. Standby facilitates the connection and documentation; we are not a party to the engagement and are not responsible for performance, payment, or disputes between the parties.",
      "Where Standby charges a fee for paid features (for example, premium compliance reporting), the applicable price and terms will be disclosed before you incur the charge.",
    ],
  },
  {
    heading: "6. Acceptable use",
    body: [
      "You agree not to misuse the Service: no unlawful, fraudulent, or harmful activity; no submitting false credentials or impersonating others; no scraping, reverse-engineering, or attempting to access data you are not authorized to access; and no use that interferes with the Service’s operation or security.",
    ],
  },
  {
    heading: "7. Disclaimers and limitation of liability",
    body: [
      "The Service is provided “as is” without warranties of any kind, to the fullest extent permitted by law. We do not warrant that risk scores or staffing recommendations will be sufficient for any particular event or will satisfy any AHJ.",
      "To the maximum extent permitted by law, Standby is not liable for any indirect, incidental, or consequential damages, or for outcomes arising from medical care, staffing decisions, or events. Nothing in these Terms limits liability that cannot be limited under applicable law.",
    ],
  },
  {
    heading: "8. Changes",
    body: [
      "We may update these Terms from time to time. Material changes will be reflected by updating the effective date below and, where appropriate, by notice in the Service. Continued use after changes take effect constitutes acceptance.",
    ],
  },
  {
    heading: "9. Contact",
    body: [
      "Questions about these Terms can be sent to standbysupport@gmail.com.",
    ],
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16 lg:py-20">
        <header className="flex flex-col gap-3 pb-10 border-b border-border">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Legal</span>
          <h1 className="text-4xl font-semibold tracking-tight">Terms of Use</h1>
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
          <Link href="/privacy" className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            Read our Privacy Policy →
          </Link>
        </div>
      </div>
    </main>
  )
}
