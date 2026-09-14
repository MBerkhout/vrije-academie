import { describe, expect, it } from "vitest"

import { canPullWithoutLinkedMedusaRow } from "./webhook-queue-config"

describe("canPullWithoutLinkedMedusaRow", () => {
  it("allows product group create when Medusa has no row yet", () => {
    expect(canPullWithoutLinkedMedusaRow("productgroup")).toBe(true)
  })

  it("still requires a linked row for orders", () => {
    expect(canPullWithoutLinkedMedusaRow("order")).toBe(false)
  })
})
