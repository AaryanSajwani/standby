// ─────────────────────────────────────────────────────────────────────────────
// Review content guardrails (PR B / PR 4).
//
// Three protections the build prompts require on review (and reply) text:
//
//   • DISINTERMEDIATION — reject text containing an email address or phone
//     number on submit, with a clear inline error (not silent stripping).
//   • PHI — the medic's review must not describe a patient encounter. This is a
//     real exposure, prevented structurally: warn on obvious patterns before
//     submission. (Warning, not a hard block — clinicians use clinical words.)
//   • LENGTH — 1000-character cap.
//
// Pure validators returning structured results; the UI turns errors into inline
// messages and warnings into an interstitial confirmation. No DB, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_REVIEW_LENGTH = 1000

// Email: standard local@domain.tld shape…
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
// …plus the spelled-out evasion "name at domain dot com" / "name(at)domain(dot)com"
// / "name @ domain . com". Requires local → at/@ → domain → dot/. → tld, so it
// does NOT fire on ordinary prose like "arrived at 18:00" or "rates @ the venue"
// (no dot+tld follows).
const OBFUSCATED_EMAIL_RE =
  /[a-z0-9._%+-]+\s*[([]?\s*(?:at|@)\s*[)\]]?\s*[a-z0-9-]+\s*[([]?\s*(?:dot|\.)\s*[)\]]?\s*[a-z]{2,}\b/i

// Phone: US-style 10-digit numbers in common separators, or a bare 10–11 digit
// run, optionally with a country/area prefix. Deliberately conservative — the
// error tells the reviewer to remove contact info, so a rare false positive is a
// nudge, not data loss.
const PHONE_RES: RegExp[] = [
  /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/, // 602-555-1234, (602) 555 1234, +1 602.555.1234
  /(?<!\d)\d{10,11}(?!\d)/, // 6025551234 / 16025551234 as an isolated run
]

// Off-platform channels: explicit links, bare domains, @handles, and the common
// payment/messaging apps people use to move coordination off Standby. Same intent
// as the email/phone guards — disintermediation is the thing being prevented.
const LINK_RES: RegExp[] = [
  /\b(?:https?:\/\/|www\.)\S+/i, // http(s):// or www. links
  /\b[a-z0-9-]{2,}\.(?:com|net|org|io|co|me|info|xyz|app|dev|gg|biz|us|link|site|online)\b/i, // bare domain
  /(?:^|[^a-z0-9._%+@-])@[a-z0-9._]{2,}/i, // @handle (not an email's @, which is flanked by word chars)
  /\b(?:venmo|cash\s?app|paypal|zelle|telegram|whats\s?app|snapchat|instagram)\b/i, // payment / messaging apps
]

// Map full-width (０-９), Arabic-Indic (٠-٩), and Extended Arabic-Indic (۰-۹)
// digits to ASCII so a phone number typed in Unicode digits can't slip past \d.
function normalizeDigits(text: string): string {
  return text.replace(/[０-９٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0)
    if (code >= 0xff10 && code <= 0xff19) return String(code - 0xff10)
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660)
    return String(code - 0x06f0)
  })
}

// Obvious PHI / patient-encounter language. Word-boundaried, case-insensitive.
const PHI_PATTERNS: RegExp[] = [
  /\bpatient(s)?\b/i,
  /\bdiagnos(is|ed|es)\b/i,
  /\btreat(ed|ment|ing)?\b/i,
  /\badminister(ed|ing)?\b/i,
  /\b(vitals|blood pressure|\bbp\b|pulse|heart rate)\b/i,
  /\b(seizure|overdose|cardiac|laceration|fracture|allergic reaction|anaphyla)\b/i,
  /\b(narcan|naloxone|epinephrine|epi[\s-]?pen)\b/i,
  /\b(injur(y|ies|ed)|wound|bleeding)\b/i,
]

export interface ReviewValidation {
  ok: boolean
  /** Hard failures — block submission. */
  errors: string[]
  /** Soft flags — surface before submit but do not block. */
  warnings: string[]
}

export function containsEmail(text: string): boolean {
  return EMAIL_RE.test(text) || OBFUSCATED_EMAIL_RE.test(text)
}

export function containsPhone(text: string): boolean {
  const normalized = normalizeDigits(text)
  return PHONE_RES.some((re) => re.test(normalized))
}

/** True when the text carries an off-platform link, bare domain, @handle, or a payment/messaging app. */
export function containsOffPlatformLink(text: string): boolean {
  return LINK_RES.some((re) => re.test(text))
}

export function containsPHILanguage(text: string): boolean {
  return PHI_PATTERNS.some((re) => re.test(text))
}

/**
 * Validate free-text for a review or reply. `role` toggles the PHI check, which
 * only applies to the medic's review (an organizer wouldn't be describing care,
 * and clinical words in an organizer's text aren't a PHI signal).
 */
export function validateReviewText(
  text: string,
  role: "emt" | "organizer" = "emt"
): ReviewValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const value = text ?? ""

  if (value.length > MAX_REVIEW_LENGTH) {
    errors.push(`Keep it under ${MAX_REVIEW_LENGTH} characters (currently ${value.length}).`)
  }
  if (containsEmail(value)) {
    errors.push("Remove the email address — keep coordination on Standby.")
  }
  if (containsPhone(value)) {
    errors.push("Remove the phone number — keep coordination on Standby.")
  }
  if (containsOffPlatformLink(value)) {
    errors.push("Remove off-platform links, handles, or payment apps — keep coordination on Standby.")
  }
  if (role === "emt" && containsPHILanguage(value)) {
    warnings.push(
      "This looks like it may describe a patient or care provided. Do not include patient information, medical details, or descriptions of care."
    )
  }

  return { ok: errors.length === 0, errors, warnings }
}
