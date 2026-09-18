import { describe, expect, it } from "vitest"

import { shouldInvalidateListingsOnProductUpdate } from "./listing-cache-policy"

describe("shouldInvalidateListingsOnProductUpdate", () => {
  it("busts listings for VA Thuis updates even when the product is not on Ons aanbod", () => {
    expect(
      shouldInvalidateListingsOnProductUpdate({
        unpublished: false,
        inPlpTopSlots: false,
        isVathuis: true,
      })
    ).toBe(true)
  })

  it("keeps live-event updates off the first PLP page on the listing TTL", () => {
    expect(
      shouldInvalidateListingsOnProductUpdate({
        unpublished: false,
        inPlpTopSlots: false,
        isVathuis: false,
      })
    ).toBe(false)
  })

  it("busts listings when a product is drafted", () => {
    expect(
      shouldInvalidateListingsOnProductUpdate({
        unpublished: true,
        inPlpTopSlots: false,
        isVathuis: false,
      })
    ).toBe(true)
  })
})
