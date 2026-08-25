import { describe, expect, it } from "vitest"

import {
  productEligibleForPlpListing,
  productHasFutureAvailableSession,
} from "./event-session-eligibility"

const future = new Date(Date.now() + 86_400_000).toISOString()
const past = new Date(Date.now() - 86_400_000).toISOString()

describe("productEligibleForPlpListing", () => {
  it("lists a visible group that has no public sessions", () => {
    expect(productEligibleForPlpListing([])).toBe(true)
  })

  it("still requires a bookable future session when sessions exist", () => {
    expect(
      productEligibleForPlpListing([{ start_at: past, available_quantity: 10 }])
    ).toBe(false)
    expect(
      productEligibleForPlpListing([{ start_at: future, available_quantity: 0 }])
    ).toBe(false)
    expect(
      productEligibleForPlpListing([{ start_at: future, available_quantity: 4 }])
    ).toBe(true)
  })
})

describe("productHasFutureAvailableSession", () => {
  it("is false when there are no event items", () => {
    expect(productHasFutureAvailableSession([])).toBe(false)
  })
})
