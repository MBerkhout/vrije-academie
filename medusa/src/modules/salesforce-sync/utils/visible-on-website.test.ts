import { describe, expect, it } from "vitest"

import {
  isCourseProductVisibleOnWebsite,
  isProductgroupVisibleOnWebsite,
  isSalesforceExterneVerhuur,
} from "./visible-on-website"

describe("isSalesforceExterneVerhuur", () => {
  it("matches record type and name", () => {
    expect(isSalesforceExterneVerhuur("Externe_Verhuur")).toBe(true)
    expect(isSalesforceExterneVerhuur("Externe verhuur")).toBe(true)
    expect(isSalesforceExterneVerhuur("Lezing")).toBe(false)
  })
})

describe("isProductgroupVisibleOnWebsite", () => {
  it("skips when the group checkbox is unchecked", () => {
    expect(isProductgroupVisibleOnWebsite({ Visible_on_website__c: false })).toBe(false)
  })

  it("skips Externe verhuur groups even when the checkbox is on", () => {
    expect(
      isProductgroupVisibleOnWebsite({
        Visible_on_website__c: true,
        Productgroup_Record_Type_Developer_Name__c: "Externe_Verhuur",
      })
    ).toBe(false)
    expect(
      isProductgroupVisibleOnWebsite({
        Visible_on_website__c: true,
        Name: "Externe verhuur Amsterdam",
      })
    ).toBe(false)
  })

  it("keeps the group visible when every child is hidden", () => {
    expect(isProductgroupVisibleOnWebsite({ Visible_on_website__c: true })).toBe(true)
  })

  it("stays visible when the checkbox fields are missing", () => {
    expect(isProductgroupVisibleOnWebsite({})).toBe(true)
  })
})

describe("isCourseProductVisibleOnWebsite", () => {
  it("reads Visible_On_Website__c", () => {
    expect(isCourseProductVisibleOnWebsite({ Visible_On_Website__c: false })).toBe(false)
    expect(isCourseProductVisibleOnWebsite({ Visible_On_Website__c: true })).toBe(true)
  })

  it("hides Externe verhuur children even when the checkbox is on", () => {
    expect(
      isCourseProductVisibleOnWebsite({
        Visible_On_Website__c: true,
        RecordType: { DeveloperName: "Externe_Verhuur", Name: "Externe verhuur" },
      })
    ).toBe(false)
    expect(
      isCourseProductVisibleOnWebsite({
        Visible_On_Website__c: true,
        Name: "Externe verhuur zaal",
      })
    ).toBe(false)
  })
})
