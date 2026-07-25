import { describe, expect, it } from "vitest"

import {
  isVathuisUnlimitedAvailability,
  VATHUIS_UNLIMITED_AVAILABILITY,
} from "./vathuis-availability"
import { courseProductAvailableQuantity } from "../modules/salesforce-sync/mappings/course-product"

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
})
