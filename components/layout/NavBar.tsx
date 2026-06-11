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

const NAV_LINKS = [
  { href: "/",            label: "Home"       },
  { href: "/assess",      label: "Assessment" },
  { href: "/personnel",   label: "Personnel"  },
  { href: "/events",      label: "Events"     },
  { href: "/schedule",    label: "Schedule"   },
]

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))

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

  return (
    <header className="h-14 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
      <div className="flex items-center gap-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/standby-mark.png"
            alt="StandBy logo"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
            priority
          />
          <span className="font-mono text-sm font-semibold tracking-tight">
            <span className="text-foreground">STAND</span>
            <span className="text-primary">BY</span>
          </span>
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

        {user ? (
          <>
            <span className="font-mono text-xs text-muted-foreground tracking-wide hidden sm:block max-w-[160px] truncate">
              {user.user_metadata?.full_name ?? user.email}
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
          <Link href="/assess" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="w-3.5 h-3.5" />
            New Assessment
          </Link>
        )}
      </div>
    </header>
  )
}
