import { describe, expect, it } from "vitest"

import {
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
