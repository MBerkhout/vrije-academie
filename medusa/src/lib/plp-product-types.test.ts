import { describe, expect, it } from "vitest"

import {
  listingRowProductTypeValue,
  productTypeFacetsFromTypeValues,
  productTypeMatchesFilter,
} from "./plp-product-types"

describe("productTypeFacetsFromTypeValues", () => {
  it("counts each known product type slug", () => {
    expect(
      productTypeFacetsFromTypeValues(["Reis", "wandeling", "Reis", "Lezing", "unknown"])
    ).toEqual(
      expect.arrayContaining([
        { slug: "reis", label: "Reis", count: 2 },
        { slug: "wandeling", label: "Wandeling", count: 1 },
        { slug: "lezing", label: "Lezing", count: 1 },
      ])
    )
  })
})

describe("disjunctive Soort activiteit facets", () => {
  const allRows = [
    { product_type: "reis" },
    { product_type: "wandeling" },
    { product_type: "lezing" },
  ]

  it("PLP: facet source without product_type filter keeps other type counts", () => {
    const filtered = allRows.filter((row) =>
      productTypeMatchesFilter(row.product_type, ["reis"])
    )
    expect(filtered).toHaveLength(1)

    const facetsFromFiltered = productTypeFacetsFromTypeValues(
      filtered.map((row) => row.product_type)
    )
    expect(facetsFromFiltered.find((f) => f.slug === "wandeling")).toBeUndefined()

    const facetsDisjunctive = productTypeFacetsFromTypeValues(
      allRows.map((row) => row.product_type)
    )
    expect(facetsDisjunctive.find((f) => f.slug === "wandeling")).toEqual({
      slug: "wandeling",
      label: "Wandeling",
      count: 1,
    })
  })

  it("reads Medusa type.value on listing rows when present", () => {
    expect(
      listingRowProductTypeValue({
        type: { value: "Reis" },
        product_type: "wandeling",
      })
    ).toBe("Reis")
  })
})
