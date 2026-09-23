import { describe, expect, it } from "vitest"

import { courseProductParentGroupId } from "./course-product"

describe("courseProductParentGroupId", () => {
  it("reads the Salesforce REST name ProductGroup__c", () => {
    expect(courseProductParentGroupId({ ProductGroup__c: "a059X00000pdcCvQAI" })).toBe(
      "a059X00000pdcCvQAI"
    )
  })

  it("still accepts the lowercase spelling", () => {
    expect(courseProductParentGroupId({ Productgroup__c: "a059X00000pdcCvQAI" })).toBe(
      "a059X00000pdcCvQAI"
    )
  })

  it("returns null when the lookup is empty", () => {
    expect(courseProductParentGroupId({ ProductGroup__c: "  " })).toBeNull()
    expect(courseProductParentGroupId(null)).toBeNull()
  })
})
