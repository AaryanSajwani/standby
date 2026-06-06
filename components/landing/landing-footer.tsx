import Link from "next/link"
import { Twitter, Github, Linkedin } from "lucide-react"

export function LandingFooter() {
  return (
    <footer className="w-full max-w-[1320px] mx-auto px-5 flex flex-col md:flex-row justify-between items-start gap-8 md:gap-0 py-10 md:py-[70px] border-t border-border/40">
      {/* Left: Logo + tagline + socials */}
      <div className="flex flex-col justify-start items-start gap-8 p-4 md:p-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-6 h-6 border border-foreground/40 flex items-center justify-center group-hover:border-primary transition-colors">
            <div className="w-2 h-2 bg-foreground/40 group-hover:bg-primary transition-colors" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight text-foreground">STANDBY</span>
        </Link>
        <p className="text-foreground/80 text-sm font-medium leading-[18px] text-left">
          Event medical risk, solved.
        </p>
        <div className="flex justify-start items-start gap-3">
          <a href="#" aria-label="Twitter" className="w-4 h-4 flex items-center justify-center">
            <Twitter className="w-full h-full text-muted-foreground hover:text-foreground transition-colors" />
          </a>
          <a href="#" aria-label="GitHub" className="w-4 h-4 flex items-center justify-center">
            <Github className="w-full h-full text-muted-foreground hover:text-foreground transition-colors" />
          </a>
          <a href="#" aria-label="LinkedIn" className="w-4 h-4 flex items-center justify-center">
            <Linkedin className="w-full h-full text-muted-foreground hover:text-foreground transition-colors" />
          </a>
        </div>
      </div>

      {/* Right: Link columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 p-4 md:p-8 w-full md:w-auto">
        <div className="flex flex-col gap-3">
          <h3 className="text-muted-foreground text-sm font-medium leading-5">Product</h3>
          <div className="flex flex-col gap-2">
            {["Risk Assessment", "EMT Marketplace", "Compliance Reports", "Staffing Config"].map((item) => (
              <Link key={item} href="/assess" className="text-foreground text-sm font-normal leading-5 hover:text-primary transition-colors">
                {item}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-muted-foreground text-sm font-medium leading-5">Company</h3>
          <div className="flex flex-col gap-2">
            {["About Us", "Our Team", "Careers", "Safety Standards", "Contact"].map((item) => (
              <a key={item} href="#" className="text-foreground text-sm font-normal leading-5 hover:text-primary transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-muted-foreground text-sm font-medium leading-5">Resources</h3>
          <div className="flex flex-col gap-2">
            {["Documentation", "API Reference", "Community", "Support", "Terms of Use"].map((item) => (
              <a key={item} href="#" className="text-foreground text-sm font-normal leading-5 hover:text-primary transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
