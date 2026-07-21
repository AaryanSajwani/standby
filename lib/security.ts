/**
 * Sanitize a user-supplied redirect target down to a same-origin path.
 *
 * Blocks open redirects: absolute URLs ("https://evil.com"), protocol-relative
 * ("//evil.com"), and the backslash variant ("/\evil.com" — browsers normalize
 * "\" to "/" in http(s) URLs, so it parses as protocol-relative too). Anything
 * that isn't a plain internal path falls back.
 *
 * Every redirect built from a `?next=` (or similar) param — proxy.ts, the auth
 * callback, and any future ones — must go through this before being passed to
 * NextResponse.redirect / new URL().
 */
export function safeInternalPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback
  if (!raw.startsWith("/")) return fallback
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback
  return raw
}
