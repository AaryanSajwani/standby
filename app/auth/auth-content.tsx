"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export function AuthContent() {
  const searchParams = useSearchParams()
  const role = (searchParams.get("role") ?? "organizer") as "emt" | "organizer"
  // Post-auth landing by role: EMTs → dashboard (which routes to onboarding if needed),
  // organizers → Events (the app home). See §3.
  const next = searchParams.get("next") ?? (role === "emt" ? "/emt-dashboard" : "/events")
  const urlError = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    urlError === "callback_failed" ? "Sign-in failed — please try again." : null
  )

  const supabase = createClient()

  const callbackUrl = () => {
    const url = new URL("/auth/callback", window.location.origin)
    url.searchParams.set("next", next)
    url.searchParams.set("role", role)
    return url.toString()
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setMagicLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl(),
        data: { role },
      },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setMagicLoading(false)
  }

  const roleLabel = role === "emt" ? "EMT Portal" : "Organizer Portal"
  const roleDesc =
    role === "emt"
      ? "Access your shift requests and upcoming event schedule."
      : "Run risk assessments and book certified EMT personnel."

  if (sent) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm border border-border bg-card">
          <div className="border-b border-border px-6 py-5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              {roleLabel}
            </span>
            <h1 className="text-foreground text-xl font-semibold mt-1">Check your email</h1>
          </div>
          <div className="px-6 py-6 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              A sign-in link was sent to{" "}
              <span className="font-mono text-foreground">{email}</span>. Click it to
              continue — no password required.
            </p>
            <button
              onClick={() => setSent(false)}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider uppercase text-left w-fit"
            >
              ← Use a different email
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-border bg-card">
        {/* Header */}
        <div className="border-b border-border px-6 py-5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            {roleLabel}
          </span>
          <h1 className="text-foreground text-xl font-semibold mt-1">Sign in to Standby</h1>
          <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">{roleDesc}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-5 border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="font-mono text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Google OAuth */}
        <div className="px-6 pt-5 pb-4">
          <Button
            onClick={handleGoogle}
            disabled={googleLoading}
            variant="outline"
            className="w-full rounded-none font-mono text-xs uppercase tracking-wider gap-2.5"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </Button>
        </div>

        {/* Divider */}
        <div className="px-6 py-2 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            or
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Magic link */}
        <form onSubmit={handleMagicLink} className="px-6 pt-4 pb-6 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-none font-mono text-sm h-10"
            />
          </div>
          <Button
            type="submit"
            disabled={magicLoading || !email}
            className="w-full rounded-none font-mono text-xs uppercase tracking-wider"
          >
            {magicLoading ? "Sending…" : "Send magic link"}
          </Button>
        </form>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3">
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            {role === "emt" ? (
              <>
                Looking to book EMT coverage?{" "}
                <a
                  href="/auth?role=organizer"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Sign in as an organizer
                </a>
              </>
            ) : (
              <>
                Are you an EMT?{" "}
                <a
                  href="/auth?role=emt"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Sign in to the EMT portal
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  )
}
