"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Route-segment error boundary: a thrown render/data error (e.g. Supabase
// outage mid-RSC) lands here instead of the unstyled Next.js crash screen.
// The NavBar in the root layout stays mounted above this.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[error-boundary]", error)
  }, [error])

  return (
    <main className="min-h-[70vh] bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-border bg-card">
        <div className="border-b border-border px-6 py-5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Error
          </span>
          <h1 className="text-foreground text-xl font-semibold mt-1">Something went wrong</h1>
        </div>
        <div className="px-6 py-6 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            This page hit an unexpected error. Your data is safe — try again, or head back
            to the homepage.
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] text-muted-foreground tracking-wider">
              Ref: {error.digest}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              onClick={reset}
              className="rounded-none font-mono text-xs uppercase tracking-wider"
            >
              Try again
            </Button>
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-none font-mono text-xs uppercase tracking-wider"
              )}
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
