import { describe, expect, it } from "vitest"

import {
  isSalesforceGiftcardVoucher,
  mapSalesforceVoucherStatus,
  salesforceVoucherBalanceCents,
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
