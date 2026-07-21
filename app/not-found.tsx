import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "Page not found — Standby",
}

export default function NotFound() {
  return (
    <main className="min-h-[70vh] bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-border bg-card">
        <div className="border-b border-border px-6 py-5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">404</span>
          <h1 className="text-foreground text-xl font-semibold mt-1">Page not found</h1>
        </div>
        <div className="px-6 py-6 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className={cn(buttonVariants(), "rounded-none font-mono text-xs uppercase tracking-wider")}
            >
              Go home
            </Link>
            <Link
              href="/assess"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-none font-mono text-xs uppercase tracking-wider"
              )}
            >
              Run assessment
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
