import { describe, expect, it } from "vitest"

import {
  isCourseProductVisibleOnWebsite,
  isProductgroupVisibleOnWebsite,
} from "./visible-on-website"

describe("isProductgroupVisibleOnWebsite", () => {
  it("skips when the group checkbox is unchecked", () => {
    expect(
      isProductgroupVisibleOnWebsite(
        { Visible_on_website__c: false },
        [{ Id: "a04a", Visible_On_Website__c: true }]
      )
    ).toBe(false)
  })

  it("skips when every child is unchecked", () => {
    expect(
      isProductgroupVisibleOnWebsite({ Visible_on_website__c: true }, [
        { Id: "a04a", Visible_On_Website__c: false },
        { Id: "a04b", Visible_On_Website__c: false },
      ])
    ).toBe(false)
  })

  it("imports when the group is visible and at least one child is visible", () => {
    expect(
      isProductgroupVisibleOnWebsite({ Visible_on_website__c: true }, [
        { Id: "a04a", Visible_On_Website__c: false },
        { Id: "a04b", Visible_On_Website__c: true },
      ])
    ).toBe(true)
  })

  it("stays visible when the checkbox fields are missing", () => {
    expect(isProductgroupVisibleOnWebsite({}, [{ Id: "a04a" }])).toBe(true)
    expect(isProductgroupVisibleOnWebsite({}, [])).toBe(true)
  })
})

describe("isCourseProductVisibleOnWebsite", () => {
  it("reads Visible_On_Website__c", () => {
    expect(isCourseProductVisibleOnWebsite({ Visible_On_Website__c: false })).toBe(false)
    expect(isCourseProductVisibleOnWebsite({ Visible_On_Website__c: true })).toBe(true)
  })
})
