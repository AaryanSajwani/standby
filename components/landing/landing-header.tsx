"use client"

import type React from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { name: "Features", href: "#features-section" },
  { name: "Pricing", href: "#pricing-section" },
  { name: "FAQ", href: "#faq-section" },
]

export function LandingHeader() {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const el = document.getElementById(href.substring(1))
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <header className="w-full py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-6 h-6 border border-foreground/60 flex items-center justify-center group-hover:border-primary transition-colors">
              <div className="w-2 h-2 bg-foreground/60 group-hover:bg-primary transition-colors" />
            </div>
            <span className="font-mono text-sm font-semibold tracking-tight text-foreground">STANDBY</span>
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={(e) => handleScroll(e, item.href)}
                className="text-muted-foreground hover:text-foreground px-4 py-2 rounded-full font-medium transition-colors text-sm"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/assess" className={cn(buttonVariants({ size: "sm" }), "hidden md:flex rounded-full px-5")}>
            Start Assessment
          </Link>
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="text-foreground md:hidden" />}>
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-background border-t border-border text-foreground">
              <SheetHeader>
                <SheetTitle className="text-left text-xl font-semibold text-foreground">Navigation</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-6">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={(e) => handleScroll(e, item.href)}
                    className="text-muted-foreground hover:text-foreground text-lg py-2"
                  >
                    {item.name}
                  </Link>
                ))}
                <Link href="/assess" className={cn(buttonVariants(), "w-full mt-4 rounded-full")}>
                  Start Assessment
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
