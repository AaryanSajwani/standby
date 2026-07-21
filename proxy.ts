import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { clientIp, rateLimit } from "@/lib/rate-limit"
import { safeInternalPath } from "@/lib/security"

// Per-IP request budgets (fixed 60s windows, per server instance — see
// lib/rate-limit.ts for the honest scope of that guarantee). Budgets are
// deliberately generous: one page view fans out into several RSC/prefetch
// requests, and campus/office NAT puts many users behind one IP. They exist
// to stop scripted hammering, not to police fast humans.
const WINDOW_MS = 60_000
const AUTH_LIMIT = 30 // /auth + /auth/callback — a real sign-in is ~3 requests
const PAGE_LIMIT = 300 // everything else the matcher lets through

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limit before any Supabase work — a 429 must not cost an auth roundtrip.
  const isAuthPath = pathname === "/auth" || pathname.startsWith("/auth/")
  const verdict = rateLimit(
    `${isAuthPath ? "auth" : "page"}:${clientIp(request)}`,
    isAuthPath ? AUTH_LIMIT : PAGE_LIMIT,
    WINDOW_MS
  )
  if (!verdict.ok) {
    return new NextResponse("Too many requests. Try again in a moment.", {
      status: 429,
      headers: {
        "Retry-After": String(verdict.retryAfterSec),
        "Content-Type": "text/plain; charset=utf-8",
      },
    })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add any logic between createServerClient and getUser().
  // A session refresh may set new cookies that must be propagated.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { searchParams } = request.nextUrl

  // Redirect already-signed-in users away from /auth. `next` is user input —
  // safeInternalPath blocks open-redirect payloads before it reaches new URL().
  if (pathname === "/auth" && user) {
    const next = safeInternalPath(searchParams.get("next"))
    return NextResponse.redirect(new URL(next, request.url))
  }

  // Protect /emt-dashboard — must be signed in
  if (pathname.startsWith("/emt-dashboard") && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth"
    url.searchParams.set("role", "emt")
    url.searchParams.set("next", "/emt-dashboard")
    return NextResponse.redirect(url)
  }

  // Protect /events (organizer bookings) — must be signed in
  if (pathname.startsWith("/events") && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth"
    url.searchParams.set("role", "organizer")
    url.searchParams.set("next", "/events")
    return NextResponse.redirect(url)
  }

  // Protect /schedule (upcoming coverage) — must be signed in
  if (pathname.startsWith("/schedule") && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth"
    url.searchParams.set("role", "organizer")
    url.searchParams.set("next", "/schedule")
    return NextResponse.redirect(url)
  }

  // Protect /onboarding — must be signed in
  if (pathname.startsWith("/onboarding") && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
