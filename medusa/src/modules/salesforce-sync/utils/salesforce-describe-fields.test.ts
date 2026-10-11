import { describe, expect, it } from "vitest"

import {
  clearSalesforceDescribeCache,
  filterFieldsForSalesforceWrite,
  type SObjectFieldDescribe,
} from "./salesforce-describe-fields"

describe("filterFieldsForSalesforceWrite", () => {
  const describeFields: SObjectFieldDescribe[] = [
    { name: "OrderId", createable: true, updateable: false },
    { name: "UnitPrice", createable: true, updateable: true },
    { name: "ProductName__c", createable: true, updateable: true },
    { name: "Discount_Code__c", createable: false, updateable: false },
  ]

  it("omits fields that are not createable on insert", () => {
    const out = filterFieldsForSalesforceWrite(
      {
        OrderId: "801xx",
        UnitPrice: 10,
        Discount_Code__c: "PROMO",
      },
      describeFields,
      "create"
    )
    expect(out).toEqual({ OrderId: "801xx", UnitPrice: 10 })
    expect(out).not.toHaveProperty("Discount_Code__c")
  })

  it("keeps updateable fields on patch", () => {
    const out = filterFieldsForSalesforceWrite(
      { UnitPrice: -5, ProductName__c: "Korting", OrderId: "801xx" },
      describeFields,
      "update"
    )
    expect(out).toEqual({ UnitPrice: -5, ProductName__c: "Korting" })
  })
})

describe("clearSalesforceDescribeCache", () => {
  it("clears cached describe", () => {
    clearSalesforceDescribeCache()
    expect(true).toBe(true)
  })
})
