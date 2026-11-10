import { describe, expect, it } from "vitest"

import {
  salesforceEffectiveDateToGrantInstant,
  toSalesforceOrderDateMetadata,
} from "./salesforce-order-effective-date"

describe("salesforceEffectiveDateToGrantInstant", () => {
  it("uses EffectiveDate at stable noon UTC", () => {
    const d = salesforceEffectiveDateToGrantInstant("2024-06-15", null)
    expect(d.toISOString()).toBe("2024-06-15T11:00:00.000Z")
  })

  it("falls back to CreatedDate", () => {
    const d = salesforceEffectiveDateToGrantInstant(null, "2024-06-15T08:30:00.000Z")
    expect(d.toISOString()).toBe("2024-06-15T11:00:00.000Z")
  })

  it("round-trips metadata", () => {
    const d = salesforceEffectiveDateToGrantInstant("2024-01-10", null)
    expect(toSalesforceOrderDateMetadata(d)).toBe(d.toISOString())
  })
})
