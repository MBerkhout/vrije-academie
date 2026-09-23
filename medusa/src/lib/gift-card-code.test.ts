import { describe, expect, it } from "vitest"

import { normalizeGiftCardCode } from "./gift-card-code"

describe("normalizeGiftCardCode", () => {
  it("keeps GTC codes unchanged", () => {
    expect(normalizeGiftCardCode("gtc-202609-172150")).toBe("GTC-202609-172150")
  })

  it("keeps GIFT codes unchanged", () => {
    expect(normalizeGiftCardCode("GIFT-A1B2C3D4")).toBe("GIFT-A1B2C3D4")
  })

  it("prefixes legacy 8-char hex codes with GIFT-", () => {
    expect(normalizeGiftCardCode("a1b2c3d4")).toBe("GIFT-A1B2C3D4")
  })

  it("keeps Salesforce redeem codes unchanged", () => {
    expect(normalizeGiftCardCode("lnl6nkd")).toBe("LNL6NKD")
  })
})
