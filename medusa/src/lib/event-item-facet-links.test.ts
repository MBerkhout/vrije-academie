import { describe, expect, it } from "vitest"

import {
  docentenForEventItem,
  isStorefrontActiveDocent,
  listingDocentenForProduct,
  mergeDocentenForProduct,
} from "./event-item-facet-links"

describe("isStorefrontActiveDocent", () => {
  it("treats is_active false as hidden", () => {
    expect(isStorefrontActiveDocent({ slug: "jan", is_active: false })).toBe(false)
    expect(isStorefrontActiveDocent({ slug: "jan", is_active: true })).toBe(true)
    expect(isStorefrontActiveDocent({ slug: "jan" })).toBe(true)
  })
})

describe("listingDocentenForProduct", () => {
  const carien = { slug: "carien-kanters", name: "Carien Kanters", is_active: true }
  const jan = { slug: "jan", name: "Jan" }

  it("uses session docenten only when present (ignores product-level highlights)", () => {
    const merged = listingDocentenForProduct(
      [carien],
      [{ event_item: { id: "ei1" } }],
      { ei1: [jan] }
    )
    expect(merged.map((d) => (d as { slug?: string }).slug)).toEqual(["jan"])
  })

  it("falls back to product-level when no session docent_id", () => {
    const merged = listingDocentenForProduct(
      [
        { slug: "active", name: "Active", is_active: true },
        { slug: "hidden", name: "Hidden", is_active: false },
      ],
      [],
      {}
    )
    expect(merged.map((d) => (d as { slug?: string }).slug)).toEqual(["active"])
  })

  it("mergeDocentenForProduct delegates to session-first listing rules", () => {
    expect(
      mergeDocentenForProduct([carien], [{ event_item: { id: "ei1" } }], { ei1: [jan] }).map(
        (d) => (d as { slug?: string }).slug
      )
    ).toEqual(["jan"])
  })
})

describe("docentenForEventItem", () => {
  const docentById = new Map([["d1", { slug: "jan", name: "Jan" }]])
  const productDocenten = [{ slug: "carien", name: "Carien", is_active: true }]

  it("prefers session instructor", () => {
    expect(
      docentenForEventItem({ id: "ei1", docent_id: "d1" }, productDocenten, docentById)
    ).toEqual([{ slug: "jan", name: "Jan" }])
  })

  it("falls back to product-level when event_item has no docent", () => {
    expect(docentenForEventItem({ id: "ei1" }, productDocenten, docentById).map(
      (d) => (d as { slug?: string }).slug
    )).toEqual(["carien"])
  })
})