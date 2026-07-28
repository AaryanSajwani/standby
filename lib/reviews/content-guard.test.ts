import { describe, it, expect } from "vitest"
import {
  MAX_REVIEW_LENGTH,
  containsEmail,
  containsPhone,
  containsPHILanguage,
  containsOffPlatformLink,
  validateReviewText,
} from "./content-guard"

describe("email detection", () => {
  it("flags addresses in prose", () => {
    expect(containsEmail("reach me at marcus@example.com anytime")).toBe(true)
    expect(containsEmail("first.last+tag@sub.domain.org")).toBe(true)
  })
  it("does not flag clean text", () => {
    expect(containsEmail("great organizer, clear site brief, paid on time")).toBe(false)
    expect(containsEmail("we discussed rates @ the venue")).toBe(false)
  })
})

describe("phone detection", () => {
  it("flags common US formats", () => {
    for (const s of [
      "call 602-555-1234",
      "(602) 555-1234",
      "602.555.1234",
      "reach me: 6025551234",
      "+1 602 555 1234",
    ]) {
      expect(containsPhone(s), s).toBe(true)
    }
  })
  it("does not flag ordinary numbers", () => {
    expect(containsPhone("covered a 6 hour shift for 300 people")).toBe(false)
    expect(containsPhone("arrived at 18:00, left at 23:30")).toBe(false)
    expect(containsPhone("rated 5 of 5")).toBe(false)
  })
})

describe("obfuscated email + unicode-digit evasion", () => {
  it("flags spelled-out and bracketed email obfuscation", () => {
    for (const s of [
      "reach me marcus at example dot com",
      "marcus(at)example(dot)com",
      "marcus @ example . com",
    ]) {
      expect(containsEmail(s), s).toBe(true)
    }
  })
  it("does not treat ordinary 'at' / '@' prose as an email", () => {
    expect(containsEmail("arrived at 18:00 and left at 23:30")).toBe(false)
    expect(containsEmail("we discussed rates @ the venue")).toBe(false)
  })
  it("flags a phone number typed in unicode digits", () => {
    expect(containsPhone("call ６０２５５５１２３４")).toBe(true) // full-width digits
  })
})

describe("off-platform link / handle / app detection", () => {
  it("flags links, bare domains, handles, and payment apps", () => {
    for (const s of [
      "see my work at https://medic.example.com",
      "portfolio at johnmedic.com",
      "dm me @john_medic on there",
      "just venmo me after",
      "pay by cashapp next time",
    ]) {
      expect(containsOffPlatformLink(s), s).toBe(true)
    }
  })
  it("does not flag ordinary feedback", () => {
    for (const s of [
      "great organizer, clear site brief, paid on time",
      "we discussed rates @ the venue",
      "clear check-in, friendly staff, well-marked medical tent",
      "arrived at 18:00, left at 23:30",
    ]) {
      expect(containsOffPlatformLink(s), s).toBe(false)
    }
  })
  it("validateReviewText blocks an off-platform link", () => {
    const r = validateReviewText("solid gig — see johnmedic.com for more", "emt")
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => /off-platform|links|handles/i.test(e))).toBe(true)
  })
})

describe("PHI language detection", () => {
  it("flags patient-encounter wording", () => {
    for (const s of [
      "treated a patient for heat exhaustion",
      "administered naloxone on site",
      "took the patient's vitals and blood pressure",
      "handled a seizure near the main stage",
    ]) {
      expect(containsPHILanguage(s), s).toBe(true)
    }
  })
  it("does not flag ordinary logistics feedback", () => {
    expect(containsPHILanguage("clear check-in, friendly staff, well-marked medical tent")).toBe(false)
  })
})

describe("validateReviewText", () => {
  it("passes clean logistics feedback", () => {
    const r = validateReviewText("Organizer had the site brief ready and paid promptly.", "emt")
    expect(r.ok).toBe(true)
    expect(r.errors).toHaveLength(0)
    expect(r.warnings).toHaveLength(0)
  })

  it("blocks on an email or phone with a clear error", () => {
    const email = validateReviewText("email me at a@b.com", "organizer")
    expect(email.ok).toBe(false)
    expect(email.errors.some((e) => /email/i.test(e))).toBe(true)

    const phone = validateReviewText("text 602-555-1234", "organizer")
    expect(phone.ok).toBe(false)
    expect(phone.errors.some((e) => /phone/i.test(e))).toBe(true)
  })

  it("blocks over-length text", () => {
    const long = "a".repeat(MAX_REVIEW_LENGTH + 1)
    const r = validateReviewText(long, "organizer")
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => /characters/i.test(e))).toBe(true)
  })

  it("accepts text exactly at the length cap", () => {
    const exact = "a".repeat(MAX_REVIEW_LENGTH)
    expect(validateReviewText(exact, "organizer").ok).toBe(true)
  })

  it("warns (but does not block) on PHI language in a medic review", () => {
    const r = validateReviewText("Treated a patient for dehydration; site was well run.", "emt")
    expect(r.ok).toBe(true) // warning only
    expect(r.warnings.length).toBeGreaterThan(0)
    expect(r.warnings[0]).toMatch(/patient|care|medical/i)
  })

  it("does not apply the PHI warning to organizer reviews", () => {
    const r = validateReviewText("Treated us to lunch; great patient communication overall.", "organizer")
    expect(r.warnings).toHaveLength(0)
  })

  it("still blocks contact info even when PHI is present", () => {
    const r = validateReviewText("Treated a patient, call me 602-555-1234", "emt")
    expect(r.ok).toBe(false)
    expect(r.errors.length).toBeGreaterThan(0)
    expect(r.warnings.length).toBeGreaterThan(0)
  })
})
