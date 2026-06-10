import { Suspense } from "react"
import { AuthContent } from "./auth-content"

export const metadata = {
  title: "Sign in — Standby",
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Loading…
          </span>
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  )
}
