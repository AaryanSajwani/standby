// Server-only: who counts as a Standby admin for the moderation surface.
//
// Admin identity is an env allowlist (ADMIN_EMAILS, comma-separated), not a DB
// role — there's no admin table yet, and moderation is a rare, service-role
// operation. Checked in the /admin pages, the moderation route, AND proxy.ts
// (defense in depth). Never a NEXT_PUBLIC_ var — the list must not reach the
// browser. Empty/unset ⇒ no admins (the surface is inert), matching the
// best-effort posture elsewhere.

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmails().includes(email.toLowerCase())
}
