import { describe, expect, it } from "vitest"

import { mapSalesforceRecordType, sanitizeProductHandle } from "./productgroup"
import { productHandleFromSalesforce } from "./product-handle"

describe("product handles", () => {
  const zw = "\u200B\u200C\u200D\uFEFF"

  it("sanitizeProductHandle drops invisible characters", () => {
    expect(sanitizeProductHandle(`colleges-architectuur-in-40-gebouwen${zw}`, "x")).toBe(
      "colleges-architectuur-in-40-gebouwen"
    )
  })

  it("productHandleFromSalesforce strips invisible characters from the SKU", () => {
    expect(productHandleFromSalesforce("Name", "a0Xabc123456", `my-sku${zw}`)).toBe("my-sku")
  })
})

describe("mapSalesforceRecordType", () => {
  it("maps known Salesforce developer names onto EventGroup record types", () => {
    expect(mapSalesforceRecordType("Collegereeks")).toBe("collegereeks")
    expect(mapSalesforceRecordType("Live_Collegereeks")).toBe("collegereeks")
    expect(mapSalesforceRecordType("Lezing")).toBe("lezing")
    expect(mapSalesforceRecordType("Live_College")).toBe("lezing")
    expect(mapSalesforceRecordType("Excursie")).toBe("excursie")
    expect(mapSalesforceRecordType("Excursies_Collegereeks")).toBe("excursie")
    expect(mapSalesforceRecordType("Studiedag")).toBe("studiedag")
    expect(mapSalesforceRecordType("Online_Studiedag")).toBe("studiedag")
    expect(mapSalesforceRecordType("Lezingen_Thuis")).toBe("vathuis")
    expect(mapSalesforceRecordType("Thuis_College")).toBe("vathuis")
  })

  it("falls through unknown names (Wandeling, Reis, Workshop) to lezing", () => {
    expect(mapSalesforceRecordType("Wandeling")).toBe("lezing")
    expect(mapSalesforceRecordType("Reis")).toBe("lezing")
    expect(mapSalesforceRecordType("Workshop")).toBe("lezing")
    expect(mapSalesforceRecordType("Rondleiding")).toBe("lezing")
    expect(mapSalesforceRecordType(null)).toBe("lezing")
  })
})
