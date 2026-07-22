import Link from "next/link"
import Image from "next/image"

// Honest footer — every link points to a route that exists. No placeholder (#)
// links, no social icons for accounts we don't have yet. See STANDBY-IMPROVEMENTS §2.
const PRODUCT_LINKS = [
  { label: "Risk assessment", href: "/assess" },
  { label: "Personnel", href: "/personnel" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Methodology", href: "/methodology" },
  { label: "Pricing", href: "/#pricing-section" },
]

const COMPANY_LINKS = [
  { label: "For EMTs", href: "/for-emts" },
  { label: "Terms of use", href: "/terms" },
  { label: "Privacy policy", href: "/privacy" },
]

export function LandingFooter() {
  return (
    <footer className="w-full max-w-[1320px] mx-auto px-5 flex flex-col gap-8 py-10 md:py-[70px] border-t border-border/40">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 md:gap-0">
        {/* Left: Logo + tagline */}
        <div className="flex flex-col justify-start items-start gap-6 p-4 md:p-8">
          <Link href="/" className="flex items-center gap-2.5">
            {/* The mark is navy-on-transparent — on the navy page it needs the
                light nav surface behind it or it blends away */}
            <span className="h-8 w-8 shrink-0 bg-nav border border-nav-border flex items-center justify-center p-1">
              <Image
                src="/standby-mark.png"
                alt="StandBy logo"
                width={28}
                height={28}
                className="h-full w-full object-contain"
              />
            </span>
            <span className="font-mono text-sm font-semibold tracking-tight">
              <span className="text-foreground">STAND</span>
              <span className="text-primary">BY</span>
            </span>
          </Link>
          <p className="text-foreground/80 text-sm font-medium leading-[18px] text-left max-w-[220px]">
            Defensible event medical coverage, from risk assessment to staffed roster.
          </p>
        </div>

        {/* Right: Link columns */}
        <div className="grid grid-cols-2 gap-8 md:gap-16 p-4 md:p-8 w-full md:w-auto">
          <div className="flex flex-col gap-3">
            <h3 className="text-muted-foreground text-sm font-medium leading-5">Product</h3>
            <div className="flex flex-col gap-2">
              {PRODUCT_LINKS.map(({ label, href }) => (
                <Link key={label} href={href} className="text-foreground text-sm font-normal leading-5 hover:text-primary transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-muted-foreground text-sm font-medium leading-5">Company</h3>
            <div className="flex flex-col gap-2">
              {COMPANY_LINKS.map(({ label, href }) => (
                <Link key={label} href={href} className="text-foreground text-sm font-normal leading-5 hover:text-primary transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom strip — copyright + medical disclaimer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 md:px-8 pt-6 border-t border-border/40">
        <span className="font-mono text-xs text-muted-foreground">© 2026 Standby</span>
        <span className="text-xs text-muted-foreground/80 max-w-[640px] md:text-right leading-relaxed">
          Standby is a decision-support tool, not a medical provider. Staffing recommendations
          should be reviewed and approved by a qualified medical director.
        </span>
      </div>
    </footer>
  )
}
