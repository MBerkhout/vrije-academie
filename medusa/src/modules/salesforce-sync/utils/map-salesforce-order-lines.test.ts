import { describe, expect, it } from "vitest"

import {
  REGISTRATION_CANCELLED,
  resolveLineTitle,
  SF_LINE_GENERIC_TITLE,
} from "./resolve-salesforce-line-title"

describe("resolveLineTitle", () => {
  it("prefers ProductName__c", () => {
    expect(
      resolveLineTitle({
        ProductName__c: "Lezing Kunst",
        vaProduct__r: { Name: "Session" },
      })
    ).toBe("Lezing Kunst")
  })

  it("falls back through relationship names", () => {
    expect(
      resolveLineTitle({
        vaProduct__r: { Name: "Sessie 1", ProductGroup__r: { Name: "Groep" } },
      })
    ).toBe("Sessie 1")
  })

  it("uses generic label when empty", () => {
    expect(resolveLineTitle({})).toBe(SF_LINE_GENERIC_TITLE)
  })
})

describe("registration cancelled constant", () => {
  it("matches Salesforce status", () => {
    expect(REGISTRATION_CANCELLED).toBe("Geannuleerd")
  })
})
