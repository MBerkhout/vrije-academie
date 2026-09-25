import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { giftCardCartLockKey } from "./gift-card-cart-lock.ts"

describe("giftCardCartLockKey", () => {
  it("is a stable signed integer for the same cart", () => {
    const key = giftCardCartLockKey("cart_01M3A6JZTX1PKMAMSVE1WJNT7A")
    assert.match(key, /^-?\d+$/)
    assert.equal(giftCardCartLockKey("cart_01M3A6JZTX1PKMAMSVE1WJNT7A"), key)
    assert.notEqual(giftCardCartLockKey("cart_other"), key)
  })
})
