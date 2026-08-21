import { describe, expect, it } from "vitest"

import { buildKlarnaOrderLine } from "./build-klarna-lines"

describe("buildKlarnaOrderLine", () => {
  it("formats amount and currency for Mollie Klarna", () => {
    const lines = buildKlarnaOrderLine(100, "EUR", "Test order")
    expect(lines[0]).toMatchObject({
      type: "digital",
      description: "Test order",
      quantity: 1,
      totalAmount: { currency: "EUR", value: "100.00" },
      unitPrice: { currency: "EUR", value: "100.00" },
      vatRate: "0.00",
      vatAmount: { currency: "EUR", value: "0.00" },
    })
  })
})
