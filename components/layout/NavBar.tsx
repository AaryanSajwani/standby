"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"

const NAV_LINKS = [
  { href: "/",            label: "Dashboard"  },
  { href: "/assess",      label: "Assessment" },
  { href: "/marketplace", label: "Personnel"  },
  { href: "/events",      label: "Events"     },
  { href: "/schedule",    label: "Schedule"   },
]

export function NavBar() {
  const pathname = usePathname()

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0">
      {/* ── Left: Logo + Divider + Nav ── */}
      <div className="flex items-center gap-6">
        {/* Logo mark */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-6 h-6 border border-foreground flex items-center justify-center group-hover:border-accent transition-colors">
            <div className="w-2 h-2 bg-foreground group-hover:bg-accent transition-colors" />
          </div>
          <span className="font-mono text-sm font-medium tracking-tight">
            STANDBY
          </span>
        </Link>

        <div className="h-4 w-px bg-border" />

        {/* Primary navigation */}
        <nav className="flex items-center">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(href + "/")

            return (
              <Link
                key={href}
                href={href}
                className={[
                  "relative px-3 h-14 flex items-center text-sm transition-colors",
                  isActive
                    ? "text-foreground font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-accent"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* ── Right: Status + CTA ── */}
      <div className="flex items-center gap-4">
        {/* Live system status */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-risk-low animate-standby-pulse" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            System Online
          </span>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Primary CTA */}
        <Link
          href="/assess"
          className="h-8 px-4 bg-accent text-white text-xs font-mono uppercase tracking-wider hover:bg-accent/90 transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-3 h-3" />
          New Assessment
        </Link>
      </div>
    </header>
  )
}
