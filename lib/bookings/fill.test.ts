import { describe, it, expect } from "vitest"
import { planFill, type SlotForFill, type MedicForFill, type MedicBooking } from "./fill"

// A far-future, verified medic and a clean open slot — the happy baseline each
// test perturbs one field of.
const MEDIC: MedicForFill = { verified: true, license_expiry: "2030-01-01", hourly_rate: 30 }

const OPEN_SLOT: SlotForFill = {
  status: "open",
  invited_emt_id: null,
  starts_at: "2026-09-01T14:00:00Z",
  event_date: "2026-09-01",
  duration_hours: 6,
}

const INVITED_SLOT = (medicId: string): SlotForFill => ({
  ...OPEN_SLOT,
  status: "invited",
  invited_emt_id: medicId,
})

const MEDIC_ID = "11111111-1111-1111-1111-111111111111"

describe("planFill — slot availability + source", () => {
  it("fills an open slot from an application", () => {
    const r = planFill(OPEN_SLOT, MEDIC, MEDIC_ID, "application", [])
    expect(r).toEqual({
      ok: true,
      plan: { emt_id: MEDIC_ID, rate_cents: 3000, fromStatus: "open", toStatus: "accepted" },
    })
  })

  it("fills a held slot from the invited medic's acceptance", () => {
    const r = planFill(INVITED_SLOT(MEDIC_ID), MEDIC, MEDIC_ID, "invitation", [])
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.plan.fromStatus).toBe("invited")
  })

  it("rejects an application against a non-open slot", () => {
    expect(planFill(INVITED_SLOT(MEDIC_ID), MEDIC, MEDIC_ID, "application", [])).toEqual({
      ok: false,
      error: "SLOT_NOT_AVAILABLE",
    })
    expect(planFill({ ...OPEN_SLOT, status: "accepted" }, MEDIC, MEDIC_ID, "application", [])).toEqual({
      ok: false,
      error: "SLOT_NOT_AVAILABLE",
    })
  })

  it("rejects an invitation acceptance addressed to a DIFFERENT medic (test-15 leak class)", () => {
    const slot = INVITED_SLOT("22222222-2222-2222-2222-222222222222")
    expect(planFill(slot, MEDIC, MEDIC_ID, "invitation", [])).toEqual({
      ok: false,
      error: "SLOT_NOT_AVAILABLE",
    })
  })

  it("rejects an invitation acceptance when the slot isn't held", () => {
    expect(planFill(OPEN_SLOT, MEDIC, MEDIC_ID, "invitation", [])).toEqual({
      ok: false,
      error: "SLOT_NOT_AVAILABLE",
    })
  })
})

describe("planFill — verification", () => {
  it("rejects an unverified medic", () => {
    expect(planFill(OPEN_SLOT, { ...MEDIC, verified: false }, MEDIC_ID, "application", [])).toEqual({
      ok: false,
      error: "MEDIC_NOT_VERIFIED",
    })
  })

  it("rejects a missing emt_profile", () => {
    expect(planFill(OPEN_SLOT, null, MEDIC_ID, "application", [])).toEqual({
      ok: false,
      error: "MEDIC_NOT_VERIFIED",
    })
  })
})

describe("planFill — certification validity at the shift date (spec test 2)", () => {
  it("rejects a license that lapses BEFORE the shift", () => {
    const medic = { ...MEDIC, license_expiry: "2026-08-31" } // day before 2026-09-01
    expect(planFill(OPEN_SLOT, medic, MEDIC_ID, "application", [])).toEqual({
      ok: false,
      error: "CERT_EXPIRES_BEFORE_EVENT",
    })
  })

  it("accepts a license valid THROUGH the shift date (equal date is valid)", () => {
    const medic = { ...MEDIC, license_expiry: "2026-09-01" }
    expect(planFill(OPEN_SLOT, medic, MEDIC_ID, "application", []).ok).toBe(true)
  })

  it("uses event_date when the slot has no explicit start", () => {
    const slot = { ...OPEN_SLOT, starts_at: null }
    const medic = { ...MEDIC, license_expiry: "2026-08-31" }
    expect(planFill(slot, medic, MEDIC_ID, "application", []).ok).toBe(false)
    expect(planFill({ ...slot }, { ...MEDIC, license_expiry: "2026-09-01" }, MEDIC_ID, "application", []).ok).toBe(true)
  })
})

describe("planFill — double booking (spec test 3)", () => {
  const overlapping: MedicBooking = {
    status: "accepted",
    starts_at: "2026-09-01T16:00:00Z", // starts inside the 14:00–20:00 window
    event_date: "2026-09-01",
    duration_hours: 4,
  }

  it("rejects a medic already committed to an overlapping shift", () => {
    expect(planFill(OPEN_SLOT, MEDIC, MEDIC_ID, "application", [overlapping])).toEqual({
      ok: false,
      error: "MEDIC_DOUBLE_BOOKED",
    })
  })

  it("allows a non-overlapping shift on the same day", () => {
    const later: MedicBooking = { ...overlapping, starts_at: "2026-09-01T20:00:00Z" } // touches the edge → no overlap
    expect(planFill(OPEN_SLOT, MEDIC, MEDIC_ID, "application", [later]).ok).toBe(true)
  })

  it("ignores non-committed conflicts (pending / invited are not commitments)", () => {
    const pending: MedicBooking = { ...overlapping, status: "pending" }
    const invited: MedicBooking = { ...overlapping, status: "invited" }
    expect(planFill(OPEN_SLOT, MEDIC, MEDIC_ID, "application", [pending, invited]).ok).toBe(true)
  })
})

describe("planFill — rate snapshot in integer cents", () => {
  it("snapshots a whole-dollar posted rate", () => {
    const r = planFill(OPEN_SLOT, { ...MEDIC, hourly_rate: 28 }, MEDIC_ID, "application", [])
    expect(r.ok && r.plan.rate_cents).toBe(2800)
  })

  it("snapshots a half-dollar posted rate without float drift", () => {
    const r = planFill(OPEN_SLOT, { ...MEDIC, hourly_rate: 27.5 }, MEDIC_ID, "application", [])
    expect(r.ok && r.plan.rate_cents).toBe(2750)
  })
})
