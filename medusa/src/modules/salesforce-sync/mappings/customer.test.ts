import { describe, expect, it } from "vitest"

import {
  contactFieldsFromMedusa,
  CUSTOMER_METADATA_KEYS,
  customerProfileFromSalesforce,
  personAccountFieldsFromMedusa,
  type MedusaCustomerShape,
} from "./customer"

const baseCustomer: MedusaCustomerShape = {
  id: "cus_test",
  first_name: "Mick",
  last_name: "Berkhout",
  email: "mick@example.com",
  metadata: {
    [CUSTOMER_METADATA_KEYS.salutation]: "Geachte heer/mevrouw",
  },
}

describe("customer push salutation", () => {
  it("does not send Salutation or Salutation__c on Person Account or Contact", () => {
    const account = personAccountFieldsFromMedusa(baseCustomer, "012xxx")
    const contact = contactFieldsFromMedusa(baseCustomer)
    expect(account).not.toHaveProperty("Salutation")
    expect(account).not.toHaveProperty("Salutation__c")
    expect(contact).not.toHaveProperty("Salutation")
    expect(contact).not.toHaveProperty("Salutation__c")
  })
})

describe("customer pull salutation", () => {
  it("maps Salutation__c into sf_salutation metadata", () => {
    const profile = customerProfileFromSalesforce({
      FirstName: "Mick",
      LastName: "Berkhout",
      Email: "mick@example.com",
      Salutation__c: "Geachte heer/mevrouw",
    })
    expect(profile.metadata?.[CUSTOMER_METADATA_KEYS.salutation]).toBe("Geachte heer/mevrouw")
  })
})
