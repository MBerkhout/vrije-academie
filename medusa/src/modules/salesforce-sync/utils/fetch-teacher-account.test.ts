import { describe, expect, it } from "vitest"

import { teacherVisibleOnWebsiteFromAccount } from "./fetch-teacher-account"

describe("teacherVisibleOnWebsiteFromAccount", () => {
  it("hides when Weergeven op de site is unchecked", () => {
    expect(teacherVisibleOnWebsiteFromAccount({ Visible_on_website__c: false })).toBe(false)
  })

  it("shows when checked or missing", () => {
    expect(teacherVisibleOnWebsiteFromAccount({ Visible_on_website__c: true })).toBe(true)
    expect(teacherVisibleOnWebsiteFromAccount({})).toBe(true)
    expect(teacherVisibleOnWebsiteFromAccount({ Visible_on_website__c: null })).toBe(true)
  })
})