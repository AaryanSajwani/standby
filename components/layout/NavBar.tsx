"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { Plus } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type NavLink = { href: string; label: string }

// Signed-out visitors get a marketing nav; the only auth entry used to be buried
// mid-hero. Signed-in users get an app nav keyed to their role. See §3.
const MARKETING_LINKS: NavLink[] = [
  { href: "/#how-it-works",   label: "How it works" },
  { href: "/#pricing-section", label: "Pricing"     },
  { href: "/for-emts",        label: "For EMTs"     },
]

const ORGANIZER_LINKS: NavLink[] = [
  { href: "/events",     label: "Events"         },
  { href: "/assess",     label: "New assessment" },
  { href: "/personnel",  label: "Personnel"      },
  { href: "/schedule",   label: "Schedule"       },
]

const EMT_LINKS: NavLink[] = [
  { href: "/emt-dashboard", label: "Dashboard" },
  { href: "/personnel",     label: "Personnel" },
]

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoaded(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push("/")
    router.refresh()
  }

  const role = user?.user_metadata?.role
  const isSignedIn = Boolean(user)
  const links: NavLink[] = !isSignedIn
    ? MARKETING_LINKS
    : role === "emt"
    ? EMT_LINKS
    : ORGANIZER_LINKS

  const isActive = (href: string) => {
    if (href.includes("#")) return false
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")
  }

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

        <Separator orientation="vertical" className="h-4 hidden md:block" />

        <nav className="hidden md:flex items-center">
          {links.map(({ href, label }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "relative px-3 h-14 flex items-center text-sm transition-colors",
                  active
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
        {/* System status — app chrome only, not on the marketing nav */}
        {isSignedIn && (
          <>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-risk-low animate-standby-pulse" />
              <span className="text-xs font-mono text-muted-foreground tracking-wider">System Online</span>
            </div>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
          </>
        )}

        {!loaded ? (
          // Reserve space until auth resolves — avoids a sign-in → app-nav flash
          <span className="font-mono text-xs text-muted-foreground tracking-wide">…</span>
        ) : isSignedIn ? (
          <>
            <span className="font-mono text-xs text-muted-foreground tracking-wide hidden sm:block max-w-[160px] truncate">
              {user?.user_metadata?.full_name ?? user?.email}
            </span>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <button
              onClick={handleSignOut}
              className="font-mono text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/auth"
              className="font-mono text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
            >
              Sign in
            </Link>
            <Link href="/assess" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="w-3.5 h-3.5" />
              Start assessment
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
