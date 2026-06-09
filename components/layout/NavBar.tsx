"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { Plus } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/",            label: "Home"       },
  { href: "/assess",      label: "Assessment" },
  { href: "/marketplace", label: "Personnel"  },
  { href: "/events",      label: "Events"     },
  { href: "/schedule",    label: "Schedule"   },
]

export function NavBar() {
  const pathname = usePathname()

  return (
    <header className="h-14 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
      <div className="flex items-center gap-5">
        <Link href="/" className="flex items-center">
          <Image
            src="/standby-logo.png"
            alt="Standby"
            width={96}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>

        <Separator orientation="vertical" className="h-4" />

        <nav className="flex items-center">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "relative px-3 h-14 flex items-center text-sm transition-colors",
                  isActive
                    ? "text-foreground font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-risk-low animate-standby-pulse" />
          <span className="text-xs font-mono text-muted-foreground tracking-wider">System Online</span>
        </div>

        <Separator orientation="vertical" className="h-4" />

        <Link href="/assess" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="w-3.5 h-3.5" />
          New Assessment
        </Link>
      </div>
    </header>
  )
}
