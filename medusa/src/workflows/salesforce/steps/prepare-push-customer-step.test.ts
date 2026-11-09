import { describe, expect, it } from "vitest"

import {
  customerHasLegacyImportPending,
  isUnchangedLinkedCustomer,
} from "./prepare-push-customer-step"

describe("customerHasLegacyImportPending", () => {
  it("is true only when legacy_import_pending is true", () => {
    expect(customerHasLegacyImportPending({ legacy_import_pending: true })).toBe(true)
    expect(customerHasLegacyImportPending({ legacy_import_pending: false })).toBe(false)
    expect(customerHasLegacyImportPending({})).toBe(false)
    expect(customerHasLegacyImportPending(null)).toBe(false)
  })
})

describe("isUnchangedLinkedCustomer", () => {
  const fp = '{"email":"a@b.nl"}'

  it("skips when both ids are stored and fingerprint matches", () => {
    expect(
      isUnchangedLinkedCustomer(
        {
          salesforce_id: "003xxx",
          salesforce_account_id: "001xxx",
          mapping_version: fp,
        },
        fp
      )
    ).toBe(true)
  })

  it("does not skip when ids are missing even if fingerprint matches", () => {
    expect(
      isUnchangedLinkedCustomer({ salesforce_id: null, salesforce_account_id: null, mapping_version: fp }, fp)
    ).toBe(false)
    expect(
      isUnchangedLinkedCustomer({ salesforce_id: "003xxx", salesforce_account_id: null, mapping_version: fp }, fp)
    ).toBe(false)
  })

  it("does not skip when isCreate is set", () => {
    expect(
      isUnchangedLinkedCustomer(
        {
          salesforce_id: "003xxx",
          salesforce_account_id: "001xxx",
          mapping_version: fp,
        },
        fp,
        true
      )
    ).toBe(false)
  })

  it("does not skip when fingerprint differs", () => {
    expect(
      isUnchangedLinkedCustomer(
        {
          salesforce_id: "003xxx",
          salesforce_account_id: "001xxx",
          mapping_version: fp,
        },
        '{"email":"other@b.nl"}'
      )
    ).toBe(false)
  })
})
