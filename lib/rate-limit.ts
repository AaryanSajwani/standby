// In-memory fixed-window rate limiter, used by proxy.ts.
//
// Scope honesty: state lives in module memory, so limits are per server
// instance (per Vercel function instance / region), not global. Fluid Compute
// reuses instances across requests, so this reliably absorbs bursts and
// single-source floods — but a distributed attack or cold-start spread resets
// the window. Treat it as the free first line of defense; the durable limits
// are the DB-side caps (migrations 0004–0005) and, if ever needed, Vercel WAF
// rules in the dashboard.

import type { NextRequest } from "next/server"

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Memory bound: ~10k distinct keys per instance. When full, expired entries
// are purged; if still full (active flood), the oldest entry is evicted —
// mildly lenient to an attacker, never harmful to legitimate users.
const MAX_BUCKETS = 10_000

export interface RateLimitResult {
  ok: boolean
  retryAfterSec: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (bucket && now < bucket.resetAt) {
    bucket.count++
    if (bucket.count > limit) {
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
    }
    return { ok: true, retryAfterSec: 0 }
  }

  if (buckets.size >= MAX_BUCKETS) {
    for (const [k, b] of buckets) {
      if (now >= b.resetAt) buckets.delete(k)
    }
    if (buckets.size >= MAX_BUCKETS) {
      const oldest = buckets.keys().next().value
      if (oldest !== undefined) buckets.delete(oldest)
    }
  }

  buckets.set(key, { count: 1, resetAt: now + windowMs })
  return { ok: true, retryAfterSec: 0 }
}

// Loose IP-shape check: hex digits, dots, colons only, and short enough to be
// a textual IPv4/IPv6 address. Enough to reject non-IP junk and cap length so
// a spoofed header can't mint arbitrary or unbounded rate-limit bucket keys.
function isIpish(s: string): boolean {
  return s.length > 0 && s.length <= 45 && /^[0-9a-fA-F.:]+$/.test(s) && /[.:]/.test(s)
}

// Client IP for keying. Vercel sets both x-forwarded-for and x-real-ip from the
// connection (client-supplied values are overwritten at the edge). Prefer
// x-real-ip: it's the single true client IP with no attacker-appended list, so
// it's a tighter key than trusting the leftmost x-forwarded-for token. Validate
// the shape before trusting either, and fall back to "local" (dev) rather than
// keying on garbage. NOTE: off the Vercel edge — behind a proxy that appends
// rather than overwrites XFF — neither header is trustworthy without a
// trusted-hop model; that's the full fix if this ever runs elsewhere.
export function clientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp && isIpish(realIp)) return realIp

  const xff = request.headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0].trim()
    if (isIpish(first)) return first
  }
  return "local"
}
