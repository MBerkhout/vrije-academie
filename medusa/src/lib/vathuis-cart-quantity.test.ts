import { describe, expect, it } from "vitest"
import { vathuisAddToCartPlan } from "./vathuis-cart-quantity"

describe("vathuisAddToCartPlan", () => {
  it("leaves non-vathuis quantities unchanged", () => {
    expect(
      vathuisAddToCartPlan({
        isVathuis: false,
        alreadyInCart: false,
        requestedQuantity: 3,
      })
    ).toEqual({ action: "add", quantity: 3 })
  })

  it("adds a VA Thuis bundle at quantity 1", () => {
    expect(
      vathuisAddToCartPlan({
        isVathuis: true,
        alreadyInCart: false,
        requestedQuantity: 4,
      })
    ).toEqual({ action: "add", quantity: 1 })
  })

  it("skips when the VA Thuis bundle is already in the cart", () => {
    expect(
      vathuisAddToCartPlan({
        isVathuis: true,
        alreadyInCart: true,
        requestedQuantity: 1,
      })
    ).toEqual({ action: "skip" })
  })
})
