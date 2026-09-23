import { describe, expect, it } from "vitest"

import {
  customerFacingCodeFromVoucher,
  resolveVoucherCustomerCode,
} from "./salesforce-voucher-code"

describe("customerFacingCodeFromVoucher", () => {
  it("prefers Code__c when it is a GTC code", () => {
    expect(
      customerFacingCodeFromVoucher({
        Code__c: "GTC-202609-172150",
        Name: "GTC-202609-999999",
      })
    ).toBe("GTC-202609-172150")
  })

  it("falls back to Name when Code__c is not GTC", () => {
    expect(
      customerFacingCodeFromVoucher({
        Code__c: "172150",
        Name: "GTC-202609-172150",
      })
    ).toBe("GTC-202609-172150")
  })

  it("returns null when Code__c and Name are empty", () => {
    expect(
      customerFacingCodeFromVoucher({
        Code__c: null,
        Name: null,
      })
    ).toBeNull()
  })
})

describe("resolveVoucherCustomerCode", () => {
  it("matches Code__c without GTC prefix to searched GTC code", () => {
    expect(
      resolveVoucherCustomerCode(
        { Code__c: "202609-172150", Name: "V-1" },
        "GTC-202609-172150"
      )
    ).toBe("GTC-202609-172150")
  })

  it("matches exact Name to search", () => {
    expect(
      resolveVoucherCustomerCode(
        { Code__c: null, Name: "GTC-202609-172150" },
        "GTC-202609-172150"
      )
    ).toBe("GTC-202609-172150")
  })

  it("prefers Code__c redeem code over GTC Name when not searching", () => {
    expect(
      resolveVoucherCustomerCode(
        { Code__c: "LNL6NKD", Name: "GTC-202609-172150" },
        null
      )
    ).toBe("LNL6NKD")
  })

  it("finds redeem code when customer searches LNL6NKD", () => {
    expect(
      resolveVoucherCustomerCode(
        { Code__c: "LNL6NKD", Name: "GTC-202609-172150" },
        "LNL6NKD"
      )
    ).toBe("LNL6NKD")
  })
})
