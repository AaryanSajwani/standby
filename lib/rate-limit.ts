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

// Client IP for keying. Vercel sets x-forwarded-for / x-real-ip from the
// connection (client-supplied values are overwritten at the edge), so the
// first x-forwarded-for entry is trustworthy there. Locally both are absent.
export function clientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "local"
}
