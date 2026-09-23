import { describe, expect, it } from "vitest"

import { reconcileGiftCardBalanceWithSalesforce } from "./reconcile-gift-card-balance"

describe("reconcileGiftCardBalanceWithSalesforce", () => {
  it("lowers balance when Salesforce remaining is smaller", () => {
    expect(reconcileGiftCardBalanceWithSalesforce(5000, 3000)).toBe(3000)
  })

  it("keeps local balance when Salesforce is higher", () => {
    expect(reconcileGiftCardBalanceWithSalesforce(3000, 5000)).toBe(3000)
  })

  it("clamps negative inputs to zero", () => {
    expect(reconcileGiftCardBalanceWithSalesforce(-1, 100)).toBe(0)
  })
})
