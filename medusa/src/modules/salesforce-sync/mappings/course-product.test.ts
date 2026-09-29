import { describe, expect, it } from "vitest"

import {
  courseProductAvailableQuantity,
  courseProductParentGroupId,
  courseProductSessionCapacity,
  parseAvailabilityCapacityOccupancy,
} from "./course-product"

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

describe("parseAvailabilityCapacityOccupancy", () => {
  it("parses enrolled/capacity from a fraction", () => {
    expect(parseAvailabilityCapacityOccupancy("12/16 deelnemers")).toEqual({
      enrolled: 12,
      capacity: 16,
    })
    expect(parseAvailabilityCapacityOccupancy("12/16")).toEqual({
      enrolled: 12,
      capacity: 16,
    })
  })
})

describe("courseProductSessionCapacity", () => {
  it("uses occupancy denominator over Maximum_capacity__c", () => {
    expect(
      courseProductSessionCapacity({
        Maximum_capacity__c: 20,
        Availability_capacity__c: "12/16 deelnemers",
      })
    ).toBe(16)
  })
})

describe("courseProductAvailableQuantity", () => {
  it("derives remaining seats from occupancy when Maximum_capacity__c differs", () => {
    const sf = {
      Maximum_capacity__c: 20,
      Availability_capacity__c: "12/16 deelnemers",
    }
    expect(courseProductAvailableQuantity(sf, "collegereeks")).toBe(4)
    expect(courseProductSessionCapacity(sf)).toBe(16)
  })

  it("returns 0 when occupancy shows full session", () => {
    expect(
      courseProductAvailableQuantity(
        { Maximum_capacity__c: 20, Availability_capacity__c: "16/16" },
        "collegereeks"
      )
    ).toBe(0)
  })

  it("still respects Vol without a fraction when max is 0", () => {
    expect(
      courseProductAvailableQuantity(
        { Availability_capacity__c: "Vol", Maximum_capacity__c: 0 },
        "collegereeks"
      )
    ).toBe(0)
  })

  it("falls back to maximum when availability is empty", () => {
    expect(
      courseProductAvailableQuantity({ Maximum_capacity__c: 20 }, "collegereeks")
    ).toBe(20)
  })
})
