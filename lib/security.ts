/**
 * Sanitize a user-supplied redirect target down to a same-origin path.
 *
 * Blocks open redirects: absolute URLs ("https://evil.com"), protocol-relative
 * ("//evil.com"), and the backslash variant ("/\evil.com" — browsers normalize
 * "\" to "/" in http(s) URLs, so it parses as protocol-relative too). Anything
 * that isn't a plain internal path falls back.
 *
 * Control characters are rejected outright, up front: the WHATWG URL parser
 * strips ASCII tab/newline/CR *before* parsing, so "/\n/evil.com" (from
 * "?next=/%0A/evil.com", which URLSearchParams decodes to a real newline)
 * would collapse to "//evil.com" and slip past the prefix checks below into an
 * off-origin redirect. Reject C0 controls, DEL, and any backslash before we
 * ever look at the prefix.
 *
 * Every redirect built from a `?next=` (or similar) param — proxy.ts, the auth
 * callback, and any future ones — must go through this before being passed to
 * NextResponse.redirect / new URL().
 */
export function safeInternalPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i)
    // C0 controls (0x00–0x1F, incl. TAB/LF/CR), DEL (0x7F), backslash (0x5C).
    if (c < 0x20 || c === 0x7f || c === 0x5c) return fallback
  }
  if (!raw.startsWith("/")) return fallback
  if (raw.startsWith("//")) return fallback
  return raw
}
