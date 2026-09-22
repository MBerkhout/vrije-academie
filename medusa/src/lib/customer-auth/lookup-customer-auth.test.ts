import { describe, expect, it, vi } from "vitest"
import { Modules } from "@medusajs/framework/utils"

vi.mock("./ensure-salesforce-customer", () => ({
  salesforcePersonContactIdByEmail: vi.fn(),
}))

vi.mock("../../modules/legacy-password", () => ({
  LEGACY_PASSWORD_MODULE: "legacyPassword",
}))

import { salesforcePersonContactIdByEmail } from "./ensure-salesforce-customer"
import { lookupCustomerAuth } from "./helpers"

function makeContainer(customers: { id: string }[]) {
  const listAndCountCustomers = vi.fn().mockResolvedValue([customers, customers.length])
  const listAuthIdentities = vi.fn().mockResolvedValue([])

  return {
    resolve: (key: string) => {
      if (key === Modules.CUSTOMER) {
        return { listAndCountCustomers }
      }
      if (key === Modules.AUTH) {
        return { listAuthIdentities }
      }
      if (key === "legacyPassword") {
        return { hasLegacyPassword: vi.fn().mockResolvedValue(false) }
      }
      throw new Error(`Unexpected resolve: ${key}`)
    },
  }
}

describe("lookupCustomerAuth", () => {
  it("returns exists true when Medusa customer exists", async () => {
    vi.mocked(salesforcePersonContactIdByEmail).mockResolvedValue(null)
    const result = await lookupCustomerAuth(
      makeContainer([{ id: "cus_1" }]),
      "user@example.com"
    )
    expect(result).toEqual({ exists: true, hasPassword: false })
    expect(salesforcePersonContactIdByEmail).not.toHaveBeenCalled()
  })

  it("returns exists true when Salesforce has a Person Account but Medusa does not", async () => {
    vi.mocked(salesforcePersonContactIdByEmail).mockResolvedValue("003ABC")
    const result = await lookupCustomerAuth(makeContainer([]), "user@example.com")
    expect(result).toEqual({ exists: true, hasPassword: false })
    expect(salesforcePersonContactIdByEmail).toHaveBeenCalledWith(
      expect.anything(),
      "user@example.com"
    )
  })

  it("returns exists false when neither Medusa nor Salesforce has the email", async () => {
    vi.mocked(salesforcePersonContactIdByEmail).mockResolvedValue(null)
    const result = await lookupCustomerAuth(makeContainer([]), "unknown@example.com")
    expect(result).toEqual({ exists: false, hasPassword: false })
  })
})
