import { describe, expect, it } from "vitest"

import {
  centsToMajorEur,
  medusaOrderMoneyToCents,
  parseMedusaMoney,
} from "./money"

describe("salesforce-sync money", () => {
  it("parses major units from graph numbers and BigNumber", () => {
    expect(parseMedusaMoney(345)).toBe(345)
    expect(parseMedusaMoney({ numeric_: 1 })).toBe(1)
  })

  it("converts order graph major units to cents for SF mapping", () => {
    expect(medusaOrderMoneyToCents(345)).toBe(34500)
    expect(medusaOrderMoneyToCents(1)).toBe(100)
    expect(centsToMajorEur(34500)).toBe(345)
    expect(centsToMajorEur(100)).toBe(1)
  })
})
