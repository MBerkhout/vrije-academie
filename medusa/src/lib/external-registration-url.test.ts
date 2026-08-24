import { describe, expect, it } from "vitest"

import {
  childExternalRegistrationUrlFromSalesforce,
  externalRegistrationUrlFromMetadata,
  resolveExternalRegistrationUrl,
  resolveProductExternalRegistrationUrl,
  resolveSessionExternalRegistrationUrl,
  trimExternalRegistrationUrl,
  variantExternalRegistrationMetadata,
} from "./external-registration-url"

describe("trimExternalRegistrationUrl", () => {
  it("returns null for blank values", () => {
    expect(trimExternalRegistrationUrl(null)).toBeNull()
    expect(trimExternalRegistrationUrl("  ")).toBeNull()
    expect(trimExternalRegistrationUrl(1)).toBeNull()
  })

  it("trims a URL string", () => {
    expect(trimExternalRegistrationUrl(" https://labrys.example/va ")).toBe(
      "https://labrys.example/va"
    )
  })
})

describe("externalRegistrationUrlFromMetadata", () => {
  it("reads salesforce_external_registration_url", () => {
    expect(
      externalRegistrationUrlFromMetadata({
        salesforce_external_registration_url: " https://partner.example ",
      })
    ).toBe("https://partner.example")
    expect(externalRegistrationUrlFromMetadata({})).toBeNull()
  })
})

describe("resolveSessionExternalRegistrationUrl", () => {
  it("uses the child URL when set", () => {
    expect(
      resolveSessionExternalRegistrationUrl(
        "https://child.example",
        "https://group.example"
      )
    ).toBe("https://child.example")
  })

  it("falls back to the group URL", () => {
    expect(resolveSessionExternalRegistrationUrl(null, "https://group.example")).toBe(
      "https://group.example"
    )
    expect(resolveSessionExternalRegistrationUrl("  ", "https://group.example")).toBe(
      "https://group.example"
    )
  })
})

describe("resolveExternalRegistrationUrl", () => {
  it("prefers the product-group URL", () => {
    expect(
      resolveExternalRegistrationUrl(
        { External_Registration_URL__c: "https://group.example" },
        [{ External_Registration_URL_Product__c: "https://product.example" }]
      )
    ).toBe("https://group.example")
  })

  it("falls back to the first child External_Registration_URL_Product__c", () => {
    expect(
      resolveExternalRegistrationUrl({ External_Registration_URL__c: null }, [
        { External_Registration_URL_Product__c: "  " },
        {
          External_Registration_URL_Product__c:
            "https://labrysreizen.nl/exclusieve-groepsreizen/reisoverzicht/va-berlijn",
        },
      ])
    ).toBe("https://labrysreizen.nl/exclusieve-groepsreizen/reisoverzicht/va-berlijn")
  })

  it("returns null when neither group nor children have a URL", () => {
    expect(resolveExternalRegistrationUrl({}, [])).toBeNull()
    expect(resolveExternalRegistrationUrl(null, null)).toBeNull()
  })
})

describe("resolveProductExternalRegistrationUrl", () => {
  it("prefers group metadata over variant child URLs", () => {
    expect(
      resolveProductExternalRegistrationUrl(
        { salesforce_external_registration_url: "https://group.example" },
        [{ salesforce_external_registration_url: "https://child.example" }]
      )
    ).toBe("https://group.example")
  })

  it("uses the first variant child URL when the group has none", () => {
    expect(
      resolveProductExternalRegistrationUrl({}, [
        {},
        { salesforce_external_registration_url: "https://child.example" },
      ])
    ).toBe("https://child.example")
  })
})

describe("variantExternalRegistrationMetadata", () => {
  it("stores the child URL and keeps existing metadata", () => {
    expect(
      variantExternalRegistrationMetadata(
        { External_Registration_URL_Product__c: " https://child.example " },
        { keep: true }
      )
    ).toEqual({
      keep: true,
      salesforce_external_registration_url: "https://child.example",
    })
  })

  it("clears the stored URL when the child field is empty", () => {
    expect(
      childExternalRegistrationUrlFromSalesforce({
        External_Registration_URL_Product__c: null,
      })
    ).toBeNull()
    expect(
      variantExternalRegistrationMetadata({ External_Registration_URL_Product__c: " " })
        .salesforce_external_registration_url
    ).toBeNull()
  })
})
