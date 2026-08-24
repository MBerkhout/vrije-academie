import { afterEach, describe, expect, it } from "vitest"

import {
  stripMedusaCustomFields,
  usesSalesforceMedusaCustomFields,
} from "./salesforce-medusa-fields"

describe("usesSalesforceMedusaCustomFields", () => {
  const original = process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS

  afterEach(() => {
    if (original === undefined) delete process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS
    else process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS = original
  })

  it("is off by default (Salesforce has no Medusa_* fields)", () => {
    delete process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS
    expect(usesSalesforceMedusaCustomFields()).toBe(false)
  })

  it("treats false/0/off as disabled", () => {
    process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS = "false"
    expect(usesSalesforceMedusaCustomFields()).toBe(false)
    process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS = "0"
    expect(usesSalesforceMedusaCustomFields()).toBe(false)
  })

  it("opts in only with true/1/yes/on", () => {
    process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS = "true"
    expect(usesSalesforceMedusaCustomFields()).toBe(true)
    process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS = "1"
    expect(usesSalesforceMedusaCustomFields()).toBe(true)
  })

  it("strips Medusa_* keys when disabled", () => {
    delete process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS
    expect(
      stripMedusaCustomFields({
        Status: "Draft",
        Medusa_Order_Id__c: "order_1",
        Pricebook2Id: "01s",
      })
    ).toEqual({ Status: "Draft", Pricebook2Id: "01s" })
  })
})
