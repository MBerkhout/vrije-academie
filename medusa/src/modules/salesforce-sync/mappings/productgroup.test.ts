import { describe, expect, it } from "vitest"

import { mapSalesforceRecordType } from "./productgroup"

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
