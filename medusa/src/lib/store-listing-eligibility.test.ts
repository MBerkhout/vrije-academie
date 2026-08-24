import { describe, expect, it } from "vitest"

import { filterStoreListingProductIds } from "./store-listing-eligibility"

describe("filterStoreListingProductIds", () => {
  it("excludes unpublished products", () => {
    expect(
      filterStoreListingProductIds(
        ["pub", "draft"],
        { pub: "visible-course", draft: "hidden-course" },
        { pub: { record_type: "lezing" }, draft: { record_type: "lezing" } },
        {},
        { pub: "published", draft: "draft" }
      )
    ).toEqual(["pub"])
  })

  it("keeps products when status is not loaded", () => {
    expect(
      filterStoreListingProductIds(
        ["a"],
        { a: "course" },
        { a: { record_type: "lezing" } }
      )
    ).toEqual(["a"])
  })
})
