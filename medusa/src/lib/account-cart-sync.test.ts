import { describe, expect, it } from "vitest"

import {
  isGiftCardPurchaseLine,
  isOpenCart,
  pickCanonicalCartId,
  planCatalogLineMerge,
  unionGiftCardRedemptions,
  unionPromoCodes,
} from "./account-cart-sync"

describe("isGiftCardPurchaseLine", () => {
  it("detects gift card purchase lines", () => {
    expect(isGiftCardPurchaseLine({ is_giftcard: true })).toBe(true)
    expect(
      isGiftCardPurchaseLine({
        metadata: { gift_card: { recipient_email: "a@b.nl" } },
      })
    ).toBe(true)
    expect(isGiftCardPurchaseLine({ metadata: {} })).toBe(false)
  })
})

describe("pickCanonicalCartId", () => {
  it("picks the oldest cart id", () => {
    expect(
      pickCanonicalCartId([
        { id: "cart_b", created_at: "2026-01-02T10:00:00.000Z" },
        { id: "cart_a", created_at: "2026-01-01T10:00:00.000Z" },
      ])
    ).toBe("cart_a")
  })
})

describe("planCatalogLineMerge", () => {
  it("sums quantities for regular catalog lines", () => {
    expect(
      planCatalogLineMerge({
        isVathuis: false,
        sourceQuantity: 3,
        canonicalQuantity: 2,
      })
    ).toEqual({ action: "update", quantity: 5 })
  })

  it("adds a VA Thuis bundle at quantity 1", () => {
    expect(
      planCatalogLineMerge({
        isVathuis: true,
        sourceQuantity: 4,
        canonicalQuantity: 0,
      })
    ).toEqual({ action: "add", quantity: 1 })
  })

  it("skips when the VA Thuis bundle is already in the canonical cart", () => {
    expect(
      planCatalogLineMerge({
        isVathuis: true,
        sourceQuantity: 1,
        canonicalQuantity: 1,
      })
    ).toEqual({ action: "skip" })
  })
})

describe("unionPromoCodes", () => {
  it("deduplicates manual promo codes across carts", () => {
    expect(
      unionPromoCodes([
        { promotions: [{ code: "SAVE10", is_automatic: false }] },
        { promotions: [{ code: "save10", is_automatic: false }] },
        { promotions: [{ code: "AUTO", is_automatic: true }] },
      ])
    ).toEqual(["SAVE10"])
  })
})

describe("unionGiftCardRedemptions", () => {
  it("deduplicates gift card redemptions by code", () => {
    expect(
      unionGiftCardRedemptions([
        {
          metadata: {
            gift_card_redemptions: [{ code: "GIFT-AAA", gift_card_id: "gc_1" }],
          },
        },
        {
          metadata: {
            gift_card_redemptions: [{ code: "gift-aaa", gift_card_id: "gc_1" }],
          },
        },
      ])
    ).toEqual([{ code: "GIFT-AAA", gift_card_id: "gc_1" }])
  })
})

describe("isOpenCart", () => {
  it("treats completed carts as closed", () => {
    expect(isOpenCart({ completed_at: "2026-01-01T00:00:00.000Z" })).toBe(false)
    expect(isOpenCart({ completed_at: null })).toBe(true)
    expect(isOpenCart({ completed_at: "" })).toBe(true)
  })
})
