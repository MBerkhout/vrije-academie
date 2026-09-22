import { describe, expect, it } from "vitest"

import {
  analyzeRebookedSalesforceOrder,
  type SalesforceOrderBundle,
} from "./import-rebooked-order"

function bundle(
  overrides: Partial<SalesforceOrderBundle> & Pick<SalesforceOrderBundle, "orderItems">
): SalesforceOrderBundle {
  return {
    salesforceOrderId: "801NEW",
    order: { AccountId: "001ACC" },
    registrationsById: new Map(),
    ...overrides,
  }
}

describe("analyzeRebookedSalesforceOrder", () => {
  it("returns null when there is no negative quantity line", () => {
    const result = analyzeRebookedSalesforceOrder(
      bundle({
        orderItems: [
          {
            Id: "802A",
            Quantity: 1,
            vaProduct__c: "a04NEW",
            Registration__c: "a01NEW",
          },
        ],
        registrationsById: new Map([
          ["a01NEW", { Id: "a01NEW", Status__c: "Ingeschreven", Order__c: "801NEW" }],
        ]),
      })
    )
    expect(result).toBeNull()
  })

  it("detects omboeking with credit line and new enrollment", () => {
    const result = analyzeRebookedSalesforceOrder(
      bundle({
        orderItems: [
          {
            Id: "802CREDIT",
            Quantity: -1,
            UnitPrice: 17.5,
            vaProduct__c: "a04OLD",
            Registration__c: "a01OLD",
          },
          {
            Id: "802NEW",
            Quantity: 1,
            UnitPrice: 65,
            ProductName__c: "Studiedag",
            vaProduct__c: "a04NEW",
            Registration__c: "a01NEW",
          },
        ],
        registrationsById: new Map([
          [
            "a01OLD",
            { Id: "a01OLD", Status__c: "Omgeboekt", Order__c: "801OLD", vaProduct__c: "a04OLD" },
          ],
          [
            "a01NEW",
            { Id: "a01NEW", Status__c: "Ingeschreven", Order__c: "801NEW", vaProduct__c: "a04NEW" },
          ],
        ]),
      })
    )

    expect(result).toEqual({
      salesforceOrderId: "801NEW",
      creditLine: expect.objectContaining({ Id: "802CREDIT", Quantity: -1 }),
      enrollmentLine: expect.objectContaining({ Id: "802NEW", Quantity: 1 }),
      newRegistration: expect.objectContaining({ Id: "a01NEW", Status__c: "Ingeschreven" }),
      rebookedRegistration: expect.objectContaining({ Id: "a01OLD", Status__c: "Omgeboekt" }),
      originalSalesforceOrderId: "801OLD",
    })
  })

  it("returns null when credit registration is not Omgeboekt", () => {
    const result = analyzeRebookedSalesforceOrder(
      bundle({
        orderItems: [
          {
            Id: "802CREDIT",
            Quantity: -1,
            Registration__c: "a01OLD",
          },
          {
            Id: "802NEW",
            Quantity: 1,
            Registration__c: "a01NEW",
            vaProduct__c: "a04NEW",
          },
        ],
        registrationsById: new Map([
          ["a01OLD", { Id: "a01OLD", Status__c: "Ingeschreven", Order__c: "801OLD" }],
          ["a01NEW", { Id: "a01NEW", Status__c: "Ingeschreven", Order__c: "801NEW" }],
        ]),
      })
    )
    expect(result).toBeNull()
  })
})
