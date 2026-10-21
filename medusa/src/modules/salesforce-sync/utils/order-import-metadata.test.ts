import { describe, expect, it } from "vitest"

import {
  ORDER_SALESFORCE_ORDER_NUMBER,
  salesforceOrderNumberFromMetadata,
} from "./order-import-metadata"

describe("salesforceOrderNumberFromMetadata", () => {
  it("returns trimmed string from metadata", () => {
    expect(
      salesforceOrderNumberFromMetadata({ [ORDER_SALESFORCE_ORDER_NUMBER]: "  00001234  " })
    ).toBe("00001234")
  })

  it("coerces numeric values", () => {
    expect(salesforceOrderNumberFromMetadata({ [ORDER_SALESFORCE_ORDER_NUMBER]: 42 })).toBe("42")
  })

  it("returns null for missing or empty", () => {
    expect(salesforceOrderNumberFromMetadata(null)).toBeNull()
    expect(salesforceOrderNumberFromMetadata({})).toBeNull()
    expect(salesforceOrderNumberFromMetadata({ [ORDER_SALESFORCE_ORDER_NUMBER]: "  " })).toBeNull()
  })
})
