import { describe, expect, it } from "vitest"

import {
  isSalesforceGiftcardVoucher,
  isSalesforceVoucherMarkedExpired,
  mapSalesforceVoucherStatus,
  salesforceVoucherBalanceCents,
  salesforceVoucherExpiresAt,
} from "./fetch-salesforce-voucher"

describe("salesforceVoucherBalanceCents", () => {
  it("uses Remaining_Amount__c when present", () => {
    expect(
      salesforceVoucherBalanceCents({
        Id: "a",
        Remaining_Amount__c: 25,
        Original_Amount__c: 50,
      })
    ).toBe(2500)
  })

  it("falls back to Original_Amount__c", () => {
    expect(
      salesforceVoucherBalanceCents({
        Id: "a",
        Original_Amount__c: 50,
      })
    ).toBe(5000)
  })
})

describe("mapSalesforceVoucherStatus", () => {
  it("maps depleted statuses", () => {
    expect(mapSalesforceVoucherStatus({ Id: "a", Status__c: "Used" })).toBe("depleted")
  })

  it("defaults unknown to active", () => {
    expect(mapSalesforceVoucherStatus({ Id: "a", Status__c: "Foo" })).toBe("active")
  })

  it("returns expired when Is_Expired__c is true", () => {
    expect(
      mapSalesforceVoucherStatus({ Id: "a", Is_Expired__c: true, Status__c: "Active" })
    ).toBe("expired")
  })

  it("prefers expired flag over active status text", () => {
    expect(
      mapSalesforceVoucherStatus({
        Id: "a",
        Is_Expired__c: true,
        Status__c: "actief",
        Original_Amount__c: 22.5,
      })
    ).toBe("expired")
  })
})

describe("isSalesforceVoucherMarkedExpired", () => {
  it("accepts string true from some API responses", () => {
    expect(
      isSalesforceVoucherMarkedExpired({ Id: "a", Is_Expired__c: "true" as unknown as boolean })
    ).toBe(true)
  })

  it("reads org-specific expired checkbox api names from the row", () => {
    expect(
      isSalesforceVoucherMarkedExpired({ Id: "a", Custom_Is_Expired__c: true })
    ).toBe(true)
  })
})

describe("salesforceVoucherExpiresAt", () => {
  it("uses Einddatum__c when Expiration_Date__c is empty", () => {
    expect(
      salesforceVoucherExpiresAt({
        Id: "a",
        Expiration_Date__c: "",
        Einddatum__c: "2020-04-17",
      })
    ).toBe("2020-04-17")
  })
})

describe("isSalesforceGiftcardVoucher", () => {
  it("accepts giftcard type", () => {
    expect(isSalesforceGiftcardVoucher({ Id: "a", Type__c: "Giftcard" })).toBe(true)
  })

  it("rejects discount types", () => {
    expect(isSalesforceGiftcardVoucher({ Id: "a", Type__c: "Discount" })).toBe(false)
  })

  it("allows generic voucher type", () => {
    expect(isSalesforceGiftcardVoucher({ Id: "a", Type__c: "Voucher" })).toBe(true)
  })
})
