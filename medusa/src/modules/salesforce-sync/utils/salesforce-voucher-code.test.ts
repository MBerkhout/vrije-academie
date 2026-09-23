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

  it("returns null when neither field is GTC", () => {
    expect(
      customerFacingCodeFromVoucher({
        Code__c: "A1B2C3D4",
        Name: "Voucher 123",
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
})
