import { beforeEach, describe, expect, it, vi } from "vitest"
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
  beforeEach(() => {
    vi.mocked(salesforcePersonContactIdByEmail).mockReset()
    vi.mocked(salesforcePersonContactIdByEmail).mockResolvedValue(null)
  })

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

  it("returns exists false for admin auth only (no storefront customer for that email)", async () => {
    vi.mocked(salesforcePersonContactIdByEmail).mockResolvedValue(null)
    const listAuthIdentities = vi.fn().mockResolvedValue([
      {
        id: "authid_1",
        app_metadata: { user_id: "user_1", customer_id: "cus_other" },
        provider_identities: [
          {
            provider: "emailpass",
            provider_metadata: { password: "hashed" },
          },
        ],
      },
    ])
    const retrieveCustomer = vi.fn().mockResolvedValue({ email: "other@example.com" })
    const container = {
      resolve: (key: string) => {
        if (key === Modules.CUSTOMER) {
          return {
            listAndCountCustomers: vi.fn().mockResolvedValue([[], 0]),
            retrieveCustomer,
          }
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
    const result = await lookupCustomerAuth(container, "admin@example.com")
    expect(result).toEqual({ exists: false, hasPassword: false })
    expect(salesforcePersonContactIdByEmail).toHaveBeenCalled()
  })
})
