import { describe, expect, it } from "vitest"

import { buildKlarnaOrderLine } from "../../../providers/mollie-klarna/build-klarna-lines"
import { mapProviderToSfMethod } from "./resolve-order-payment"

describe("resolve-order-payment", () => {
  it("maps Klarna provider ids to KLARNA", () => {
    expect(mapProviderToSfMethod("pp_mollie-klarna_mollie")).toBe("KLARNA")
    expect(mapProviderToSfMethod("klarna")).toBe("KLARNA")
  })

  it("falls back to IDEAL for unknown providers", () => {
    expect(mapProviderToSfMethod("pp_unknown_provider")).toBe("IDEAL")
    expect(mapProviderToSfMethod(null)).toBe("IDEAL")
  })
})

describe("buildKlarnaOrderLine", () => {
  it("builds a single line matching the payment amount", () => {
    const lines = buildKlarnaOrderLine(49.5, "eur")
    expect(lines).toHaveLength(1)
    expect(lines[0].totalAmount).toEqual({ currency: "EUR", value: "49.50" })
    expect(lines[0].unitPrice).toEqual({ currency: "EUR", value: "49.50" })
    expect(lines[0].vatAmount).toEqual({ currency: "EUR", value: "0.00" })
  })
})
