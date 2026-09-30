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

  it("maps Bijna vol text to the almost-full remaining band, not sold out", () => {
    expect(
      courseProductAvailableQuantity(
        { Availability_capacity__c: "Bijna vol!", Maximum_capacity__c: 60 },
        "studiedag"
      )
    ).toBe(18)
    expect(
      courseProductAvailableQuantity(
        { Availability_capacity__c: "Bijna vol", Maximum_capacity__c: 0 },
        "studiedag"
      )
    ).toBe(3)
  })

  it("uses Number_Of_Participants__c when availability is only a status word", () => {
    const sf = {
      Availability_capacity__c: "Available",
      Maximum_capacity__c: 60,
      Number_Of_Participants__c: '59 / 60  <img src="/img/msg_icons/confirm16.png" alt=" " border="0"/>',
      Number_Of_Attendants__c: 59,
    }
    expect(courseProductAvailableQuantity(sf, "studiedag")).toBe(1)
    expect(courseProductSessionCapacity(sf)).toBe(60)
  })

  it("falls back to Number_Of_Attendants__c against the max", () => {
    const sf = {
      Availability_capacity__c: "Available",
      Maximum_capacity__c: 60,
      Number_Of_Attendants__c: 50,
    }
    expect(courseProductAvailableQuantity(sf, "studiedag")).toBe(10)
    expect(courseProductSessionCapacity(sf)).toBe(60)
  })

  it("keeps explicit Vol as sold out even when attendants are below max", () => {
    expect(
      courseProductAvailableQuantity(
        { Availability_capacity__c: "Vol", Maximum_capacity__c: 60, Number_Of_Attendants__c: 40 },
        "studiedag"
      )
    ).toBe(0)
  })

  it("falls back to maximum when availability is empty", () => {
    expect(
      courseProductAvailableQuantity({ Maximum_capacity__c: 20 }, "collegereeks")
    ).toBe(20)
  })
})
