import { describe, expect, it } from "vitest"

import {
  mergeWishlistHandles,
  parseWishlistHandles,
  WISHLIST_METADATA_KEY,
  wishlistHandlesEqual,
} from "./customer-wishlist"
import { favouritesWishlistFingerprint } from "../modules/salesforce-sync/utils/favourites-fingerprint"

describe("customer-wishlist", () => {
  it("parses va_wishlist from metadata", () => {
    expect(
      parseWishlistHandles({
        [WISHLIST_METADATA_KEY]: ["  foo  ", "bar", 1, ""],
      })
    ).toEqual(["foo", "bar"])
  })

  it("merges local first then remote additions", () => {
    expect(mergeWishlistHandles(["b", "a"], ["a", "c"])).toEqual(["b", "a", "c"])
  })

  it("compares handle lists", () => {
    expect(wishlistHandlesEqual(["a", "b"], ["a", "b"])).toBe(true)
    expect(wishlistHandlesEqual(["a"], ["a", "b"])).toBe(false)
  })

  it("fingerprints stable for same set", () => {
    const a = favouritesWishlistFingerprint(["z", "a"])
    const b = favouritesWishlistFingerprint(["z", "a"])
    expect(a).toBe(b)
    expect(favouritesWishlistFingerprint(["a", "z"])).not.toBe(a)
  })
})
