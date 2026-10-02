import { describe, expect, it } from "vitest"

import {
  centsToMedusaMajor,
  medusaMajorToCents,
  minPriceCentsFromVariants,
} from "./medusa-price-to-cents"

const eur = (amount: number) => [{ amount, currency_code: "eur" }]

describe("medusa-price-to-cents", () => {
  it("converts gift card cents to cart unit_price major EUR", () => {
    expect(centsToMedusaMajor(5000)).toBe(50)
    expect(centsToMedusaMajor(1500)).toBe(15)
    expect(medusaMajorToCents(50)).toBe(5000)
  })
})

describe("minPriceCentsFromVariants", () => {
  it("ignores sf-group- placeholder variants when real sessions exist", () => {
    expect(
      minPriceCentsFromVariants([
        { sku: "sf-group-a052o00001AhWzXAAV", prices: eur(18) },
        { sku: "sf-a04Mz00000rbmf4IAA", event_item: { id: "ei1" }, prices: eur(19.5) },
        { sku: "sf-a04Mz00000rc1hJIAQ", event_item: { id: "ei2" }, prices: eur(19.5) },
      ])
    ).toBe(1950)
  })

  it("ignores any variant without event_item when sessions exist", () => {
    expect(
      minPriceCentsFromVariants([
        { sku: "other", prices: eur(10) },
        { sku: "sf-x", event_item: { id: "ei1" }, prices: eur(25) },
      ])
    ).toBe(2500)
  })

  it("uses non-placeholder variants when no session has an event_item (bundles)", () => {
    expect(
      minPriceCentsFromVariants([
        { sku: "sf-group-abc", prices: eur(5) },
        { sku: "sf-bundle", prices: eur(40) },
      ])
    ).toBe(4000)
  })

  it("falls back to the placeholder price when it is the only variant", () => {
    expect(minPriceCentsFromVariants([{ sku: "sf-group-abc", prices: eur(18) }])).toBe(1800)
  })

  it("returns null without prices", () => {
    expect(minPriceCentsFromVariants([])).toBeNull()
    expect(minPriceCentsFromVariants(null)).toBeNull()
  })
})
