import { describe, expect, it } from "vitest"

import { sessionIsWaitlistEligible } from "./waitlist-eligibility"

const future = new Date(Date.now() + 86_400_000).toISOString()
const past = new Date(Date.now() - 86_400_000).toISOString()

describe("sessionIsWaitlistEligible", () => {
  it("is true for a future sold-out purchasable session", () => {
    expect(
      sessionIsWaitlistEligible({
        purchasable: true,
        event_item: { start_at: future, available_quantity: 0 },
      })
    ).toBe(true)
  })

  it("is false when spots remain", () => {
    expect(
      sessionIsWaitlistEligible({
        purchasable: true,
        event_item: { start_at: future, available_quantity: 3 },
      })
    ).toBe(false)
  })

  it("is false for past sessions", () => {
    expect(
      sessionIsWaitlistEligible({
        purchasable: true,
        event_item: { start_at: past, available_quantity: 0 },
      })
    ).toBe(false)
  })

  it("is false when not purchasable", () => {
    expect(
      sessionIsWaitlistEligible({
        purchasable: false,
        event_item: { start_at: future, available_quantity: 0 },
      })
    ).toBe(false)
  })
})
