import { describe, expect, it } from "vitest"

import {
  filterStorefrontVisibleVariants,
  isSalesforceExterneVerhuur,
  isSalesforceVisibleOnWebsite,
  isStorefrontVisibleVariant,
} from "./salesforce-visible-on-website"

describe("isSalesforceVisibleOnWebsite", () => {
  it("treats unchecked (false) as hidden", () => {
    expect(isSalesforceVisibleOnWebsite(false)).toBe(false)
  })

  it("treats checked, missing, and null as visible", () => {
    expect(isSalesforceVisibleOnWebsite(true)).toBe(true)
    expect(isSalesforceVisibleOnWebsite(null)).toBe(true)
    expect(isSalesforceVisibleOnWebsite(undefined)).toBe(true)
  })
})

describe("isStorefrontVisibleVariant", () => {
  it("hides variants flagged in metadata", () => {
    expect(
      isStorefrontVisibleVariant({ metadata: { salesforce_visible_on_website: false } })
    ).toBe(false)
    expect(isStorefrontVisibleVariant({ metadata: {} })).toBe(true)
    expect(isStorefrontVisibleVariant({})).toBe(true)
  })

  it("filters hidden variants", () => {
    expect(
      filterStorefrontVisibleVariants([
        { id: "a", metadata: { salesforce_visible_on_website: false } },
        { id: "b", metadata: { salesforce_visible_on_website: true } },
      ]).map((v) => v.id)
    ).toEqual(["b"])
  })
})

describe("isSalesforceExterneVerhuur", () => {
  it("matches titles and record types that contain verhuur", () => {
    expect(isSalesforceExterneVerhuur("Externe Verhuur")).toBe(true)
    expect(isSalesforceExterneVerhuur(null, "zaalverhuur")).toBe(true)
    expect(isSalesforceExterneVerhuur("Lunchlezing", "lezing")).toBe(false)
  })
})
