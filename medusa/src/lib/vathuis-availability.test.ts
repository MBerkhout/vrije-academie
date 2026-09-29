import { describe, expect, it } from "vitest"

import {
  isVathuisUnlimitedAvailability,
  VATHUIS_UNLIMITED_AVAILABILITY,
} from "./vathuis-availability"
import {
  courseProductAvailableQuantity,
  courseProductSessionCapacity,
} from "../modules/salesforce-sync/mappings/course-product"

describe("isVathuisUnlimitedAvailability", () => {
  it("matches vathuis record types and bundle-only purchase mode", () => {
    expect(isVathuisUnlimitedAvailability({ recordType: "vathuis" })).toBe(true)
    expect(isVathuisUnlimitedAvailability({ purchaseMode: "bundle_only" })).toBe(true)
    expect(isVathuisUnlimitedAvailability({ deliveryType: "pre_recorded" })).toBe(true)
    expect(isVathuisUnlimitedAvailability({ recordType: "collegereeks" })).toBe(false)
  })
})

describe("courseProductAvailableQuantity", () => {
  it("returns unlimited quantity for VA Thuis imports", () => {
    expect(
      courseProductAvailableQuantity(
        { Availability_capacity__c: "Vol", Maximum_capacity__c: 0 },
        "Lezingen_Thuis"
      )
    ).toBe(VATHUIS_UNLIMITED_AVAILABILITY)
  })

  it("still respects sold-out capacity for regular events", () => {
    expect(
      courseProductAvailableQuantity(
        { Availability_capacity__c: "Vol", Maximum_capacity__c: 0 },
        "collegereeks"
      )
    ).toBe(0)
  })

  it("uses Availability_capacity__c occupancy for remaining seats", () => {
    const sf = {
      Maximum_capacity__c: 20,
      Availability_capacity__c: "12/16 deelnemers",
    }
    expect(courseProductAvailableQuantity(sf, "collegereeks")).toBe(4)
    expect(courseProductSessionCapacity(sf)).toBe(16)
  })
})
