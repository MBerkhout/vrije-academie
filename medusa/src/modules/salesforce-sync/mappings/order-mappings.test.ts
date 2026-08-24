import { afterEach, describe, expect, it } from "vitest"

import {
  discountOrderItemFields,
  productOrderItemFields,
} from "./order-item"
import { orderLineLookupsToSalesforce } from "./order"
import { registrationToSalesforce } from "./registration"

describe("order Salesforce mappings", () => {
  const original = process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS

  afterEach(() => {
    if (original === undefined) delete process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS
    else process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS = original
  })

  it("writes Orderproducten name and skips formula fields", () => {
    delete process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS
    const fields = productOrderItemFields({
      externalId: "oi_1",
      orderId: "801xx",
      pricebookEntryId: "01uxx",
      product2Id: "01txx",
      vaProductId: "a04xx",
      unitPriceCents: 8900,
      registrationId: "a01xx",
      productLabel: "Studiedag",
    })
    expect(fields.ProductName__c).toBe("Studiedag")
    expect(fields.vaProduct__c).toBe("a04xx")
    expect(fields.Registration__c).toBe("a01xx")
    expect(fields.Medusa_Order_Item_Id__c).toBeUndefined()
    expect(fields).not.toHaveProperty("Product_Name__c")
    expect(fields).not.toHaveProperty("Product2Id")
  })

  it("writes discount code on korting lines", () => {
    delete process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS
    const fields = discountOrderItemFields({
      externalId: "oi_d",
      orderId: "801xx",
      pricebookEntryId: "01uxx",
      product2Id: "01txx",
      discountCents: 100,
      registrationId: "a01xx",
      promotionCode: "TEST1",
    })
    expect(fields.ProductName__c).toBe("Korting")
    expect(fields.Discount_Code__c).toBe("TEST1")
    expect(fields.UnitPrice).toBe(-1)
  })

  it("writes Inschrijving amounts and omits formula Origin/dates", () => {
    delete process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS
    const fields = registrationToSalesforce({
      externalId: "reg_1",
      orderId: "801xx",
      accountId: "001xx",
      contactId: "003xx",
      vaProductId: "a04xx",
      lineTotalCents: 8800,
      unitPriceCents: 8900,
      participantEmail: "a@b.nl",
    })
    expect(fields.Order__c).toBe("801xx")
    expect(fields.Amount__c).toBe(88)
    expect(fields.Unit_Price__c).toBe(89)
    expect(fields.EmailParticipant__c).toBe("a@b.nl")
    expect(fields.Origin__c).toBeUndefined()
    expect(fields.Medusa_Registration_Id__c).toBeUndefined()
  })

  it("sets Order header Product / Inschrijving lookups", () => {
    expect(
      orderLineLookupsToSalesforce({
        vaProductId: "a04xx",
        registrationId: "a01xx",
        product2Id: "01txx",
      })
    ).toEqual({
      Product__c: "a04xx",
      Registration__c: "a01xx",
      Product2__c: "01txx",
    })
  })
})
