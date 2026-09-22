import { describe, expect, it } from "vitest"

import { centsToMedusaMajor, medusaMajorToCents } from "./medusa-price-to-cents"

describe("medusa-price-to-cents", () => {
  it("converts gift card cents to cart unit_price major EUR", () => {
    expect(centsToMedusaMajor(5000)).toBe(50)
    expect(centsToMedusaMajor(1500)).toBe(15)
    expect(medusaMajorToCents(50)).toBe(5000)
  })
})
