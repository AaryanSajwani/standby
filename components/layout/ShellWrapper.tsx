"use client"

import { usePathname } from "next/navigation"
import { NavBar } from "./NavBar"

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <>
      <NavBar />
      <main className="flex-1 flex flex-col">{children}</main>
      {pathname !== "/" && (
        <footer className="h-8 border-t border-border bg-surface flex items-center px-6 shrink-0 print:hidden">
          <span className="text-xs font-mono text-muted-foreground">
            STANDBY v1.0 — Event Medical Risk Assessment &amp; Staffing Platform
          </span>
        </footer>
      )}
    </>
  )
}
