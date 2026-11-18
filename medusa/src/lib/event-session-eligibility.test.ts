import { describe, expect, it } from "vitest"

import {
  earliestStartAtForPlpListing,
  futureSessionsForListing,
  productEligibleForPlpListing,
  productHasFutureAvailableSession,
  productHasFutureSession,
} from "./event-session-eligibility"

const future = new Date(Date.now() + 86_400_000).toISOString()
const past = new Date(Date.now() - 86_400_000).toISOString()

describe("productEligibleForPlpListing", () => {
  it("hides a visible group that has no public sessions", () => {
    expect(productEligibleForPlpListing([])).toBe(false)
  })

  it("requires a future session when sessions exist (sold-out included)", () => {
    expect(
      productEligibleForPlpListing([{ start_at: past, available_quantity: 10 }])
    ).toBe(false)
    expect(
      productEligibleForPlpListing([{ start_at: future, available_quantity: 0 }])
    ).toBe(true)
    expect(
      productEligibleForPlpListing([{ start_at: future, available_quantity: 4 }])
    ).toBe(true)
  })
})

describe("productHasFutureSession", () => {
  it("is false when there are no event items", () => {
    expect(productHasFutureSession([])).toBe(false)
  })

  it("is true for future sessions regardless of quantity", () => {
    expect(productHasFutureSession([{ start_at: future, available_quantity: 0 }])).toBe(
      true
    )
    expect(productHasFutureSession([{ start_at: past, available_quantity: 10 }])).toBe(
      false
    )
  })
})

describe("productHasFutureAvailableSession", () => {
  it("is false when there are no event items", () => {
    expect(productHasFutureAvailableSession([])).toBe(false)
  })
})

describe("futureSessionsForListing", () => {
  it("keeps on-demand and future sessions, drops past dated sessions", () => {
    expect(
      futureSessionsForListing([
        { start_at: past },
        { start_at: future },
        { start_at: null },
      ])
    ).toEqual([{ start_at: future }, { start_at: null }])
  })
})

describe("earliestStartAtForPlpListing", () => {
  const later = new Date(Date.now() + 2 * 86_400_000).toISOString()

  it("returns the earliest future online start when there are no offline sessions", () => {
    expect(
      earliestStartAtForPlpListing([
        { delivery_type: "online", start_at: later },
        { delivery_type: "online", start_at: future },
      ])
    ).toBe(future)
  })

  it("prefers future offline over online", () => {
    expect(
      earliestStartAtForPlpListing([
        { delivery_type: "online", start_at: future },
        { delivery_type: "offline", start_at: later },
      ])
    ).toBe(later)
  })

  it("returns null for online-only on-demand sessions without start_at", () => {
    expect(
      earliestStartAtForPlpListing([{ delivery_type: "online", start_at: null }])
    ).toBeNull()
  })
})
