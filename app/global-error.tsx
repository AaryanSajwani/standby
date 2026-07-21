"use client"

import "./globals.css"

// Last-resort boundary: catches errors thrown by the ROOT layout itself, which
// app/error.tsx cannot. It replaces the entire document, so it must render its
// own <html>/<body> and import globals.css for the design tokens. Kept
// dependency-free (no Button/Link imports) — if the app shell is broken enough
// to land here, the less this file needs, the more likely it renders.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-sm border border-border bg-card">
            <div className="border-b border-border px-6 py-5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Error
              </span>
              <h1 className="text-xl font-semibold mt-1">Standby hit a snag</h1>
            </div>
            <div className="px-6 py-6 flex flex-col gap-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                An unexpected error kept the page from loading. Reload to try again.
              </p>
              {error.digest && (
                <p className="font-mono text-[10px] text-muted-foreground tracking-wider">
                  Ref: {error.digest}
                </p>
              )}
              <button
                onClick={reset}
                className="w-fit border border-border bg-primary text-primary-foreground px-4 py-2 font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Reload
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
