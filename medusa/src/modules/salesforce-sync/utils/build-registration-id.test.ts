import { describe, expect, it } from "vitest"

import {
  buildOrderItemExternalId,
  buildRegistrationExternalId,
} from "./build-registration-id"

describe("build-registration-id", () => {
  it("uses one external id per cart line", () => {
    expect(buildRegistrationExternalId("order_1", "item_a")).toBe("order_1:item_a")
    expect(buildOrderItemExternalId("order_1", "item_a", "product")).toBe(
      "order_1:item_a:product"
    )
    expect(buildOrderItemExternalId("order_1", "item_a", "discount")).toBe(
      "order_1:item_a:discount"
    )
  })
})
