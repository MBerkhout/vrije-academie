import { describe, expect, it } from "vitest"

import { computeGiftCardApplication } from "./gift-card-apply-amount"

describe("computeGiftCardApplication", () => {
  it("caps application at gift card balance in euros", () => {
    const result = computeGiftCardApplication({
      balanceCents: 4000,
      reservedCents: 0,
      cartTotalMajor: 110.09,
    })
    expect(result.appliedMajor).toBe(40)
    expect(result.appliedCents).toBe(4000)
    expect(result.remainingCents).toBe(0)
  })

  it("applies partial balance when cart is cheaper", () => {
    const result = computeGiftCardApplication({
      balanceCents: 4000,
      reservedCents: 0,
      cartTotalMajor: 25,
    })
    expect(result.appliedMajor).toBe(25)
    expect(result.appliedCents).toBe(2500)
    expect(result.remainingCents).toBe(1500)
  })
})
