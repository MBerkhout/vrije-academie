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

  it("excludes Externe verhuur titles even when published", () => {
    expect(
      filterStoreListingProductIds(
        ["pub", "rental"],
        { pub: "visible-course", rental: "externe-verhuur" },
        { pub: { record_type: "lezing" }, rental: { record_type: "lezing" } },
        {},
        { pub: "published", rental: "published" },
        { pub: "Lunchlezing", rental: "Externe Verhuur" }
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
