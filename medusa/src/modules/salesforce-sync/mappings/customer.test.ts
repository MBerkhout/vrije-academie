import { describe, expect, it } from "vitest"

import {
  accountHasCompleteMailingAddress,
  contactFieldsFromMedusa,
  contactMailingFieldsFromAddress,
  CUSTOMER_METADATA_KEYS,
  customerProfileFromSalesforce,
  medusaAddressUsableForSalesforce,
  personAccountAddressFieldsFromMedusaShape,
  personAccountFieldsFromMedusa,
  postalCodeToSalesforce,
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

describe("order address helpers", () => {
  const addr = {
    address_1: "Keizersgracht 1",
    postal_code: "1015aa",
    city: "Amsterdam",
    country_code: "nl",
  }

  it("personAccountAddressFieldsFromMedusaShape normalizes NL postcodes", () => {
    const fields = personAccountAddressFieldsFromMedusaShape(addr)
    expect(fields.PersonMailingPostalCode).toBe("1015AA")
    expect(fields.PersonMailingStreet).toBe("Keizersgracht 1")
    expect(fields.Same_account_address__c).toBe(true)
  })

  it("contactMailingFieldsFromAddress matches mailing subset", () => {
    expect(contactMailingFieldsFromAddress(addr)).toEqual({
      MailingStreet: "Keizersgracht 1",
      MailingCity: "Amsterdam",
      MailingPostalCode: "1015AA",
      MailingCountry: "Netherlands",
    })
  })

  it("medusaAddressUsableForSalesforce requires street and postal", () => {
    expect(medusaAddressUsableForSalesforce(addr)).toBe(true)
    expect(medusaAddressUsableForSalesforce({ address_1: "x" })).toBe(false)
    expect(medusaAddressUsableForSalesforce(null)).toBe(false)
  })

  it("accountHasCompleteMailingAddress accepts PersonMailing or Billing fallbacks", () => {
    expect(
      accountHasCompleteMailingAddress({
        PersonMailingStreet: "A",
        PersonMailingCity: "B",
        PersonMailingPostalCode: "1234AB",
      })
    ).toBe(true)
    expect(
      accountHasCompleteMailingAddress({
        BillingStreet: "A",
        BillingCity: "B",
        BillingPostalCode: "1234AB",
      })
    ).toBe(true)
    expect(accountHasCompleteMailingAddress({ PersonMailingStreet: "A" })).toBe(false)
  })
})

describe("postalCodeToSalesforce", () => {
  it("uppercases and compacts Dutch postcodes", () => {
    expect(postalCodeToSalesforce("2334cp", "nl")).toBe("2334CP")
    expect(postalCodeToSalesforce(" 2334 cp ", "NL")).toBe("2334CP")
  })
  it("leaves other countries and invalid values untouched", () => {
    expect(postalCodeToSalesforce("1000", "be")).toBe("1000")
    expect(postalCodeToSalesforce("abc", "nl")).toBe("abc")
    expect(postalCodeToSalesforce("", "nl")).toBeUndefined()
  })
})
