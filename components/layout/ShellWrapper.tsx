"use client"

import { usePathname } from "next/navigation"
import { NavBar } from "./NavBar"

// Routes that have their own internal navigation
const STANDALONE_ROUTES = ["/", "/assess", "/results"]

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isStandalone = STANDALONE_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  )

  return (
    <>
      {!isStandalone && <NavBar />}
      <main className="flex-1 flex flex-col">{children}</main>
      {!isStandalone && (
        <footer className="h-8 border-t border-border bg-surface flex items-center px-6 shrink-0">
          <span className="text-xs font-mono text-muted-foreground">
            STANDBY v1.0 — Event Medical Risk Assessment &amp; Staffing Platform
          </span>
        </footer>
      )}
    </>
  )
}
