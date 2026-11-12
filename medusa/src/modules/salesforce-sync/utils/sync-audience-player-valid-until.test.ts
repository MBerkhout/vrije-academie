import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("../../vathuis-access", () => ({
  VATHUIS_ACCESS_MODULE: "vathuisAccess",
}))

import { VATHUIS_ACCESS_MODULE } from "../../vathuis-access"
import { syncAudiencePlayerValidUntilForCustomer } from "./sync-audience-player-valid-until"

const resolveCustomerSalesforceIds = vi.fn()
const resolveSoftProduct = vi.fn()

vi.mock("./resolve-customer-salesforce-ids", () => ({
  resolveCustomerSalesforceIds: (...args: unknown[]) => resolveCustomerSalesforceIds(...args),
}))

vi.mock("./map-salesforce-order-lines", () => ({
  resolveSoftProduct: (...args: unknown[]) => resolveSoftProduct(...args),
}))

describe("syncAudiencePlayerValidUntilForCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("skips when integration is not ready", async () => {
    const container = {
      resolve: vi.fn((key: string) => {
        if (key === ContainerRegistrationKeys.LOGGER) return { info: vi.fn(), warn: vi.fn() }
        if (key === "salesforceSync") {
          return { isIntegrationReady: vi.fn().mockResolvedValue(false) }
        }
        throw new Error(`unexpected ${key}`)
      }),
    }
    const result = await syncAudiencePlayerValidUntilForCustomer(
      container as never,
      "cust_1"
    )
    expect(result).toBeNull()
  })

  it("applies override for vathuis registrations", async () => {
    const applyValidUntilOverride = vi.fn().mockResolvedValue(true)
    const query = vi.fn().mockResolvedValue({
      records: [
        {
          Id: "a01REG",
          vaProduct__c: "vp1",
          Audience_Player_Valid_Until__c: "2027-06-01",
          Status__c: "Ingeschreven",
        },
      ],
    })

    resolveCustomerSalesforceIds.mockResolvedValue({
      contactId: "003",
      accountId: "001",
    })
    resolveSoftProduct.mockResolvedValue({
      productId: "prod_1",
      handle: "test-bundle",
      isVathuis: true,
      variantId: "var_1",
    })

    const container = {
      resolve: vi.fn((key: string) => {
        if (key === ContainerRegistrationKeys.LOGGER) return { info: vi.fn(), warn: vi.fn() }
        if (key === "salesforceSync") {
          return {
            isIntegrationReady: vi.fn().mockResolvedValue(true),
            getStateBySalesforceId: vi.fn().mockResolvedValue(null),
            query,
          }
        }
        if (key === VATHUIS_ACCESS_MODULE) return { applyValidUntilOverride }
        throw new Error(`unexpected ${key}`)
      }),
    }

    const result = await syncAudiencePlayerValidUntilForCustomer(
      container as never,
      "cust_1",
      "user@example.com"
    )

    expect(result).toEqual({ scanned: 1, updated: 1 })
    expect(applyValidUntilOverride).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cust_1",
        productId: "prod_1",
        salesforceRegistrationId: "a01REG",
      })
    )
  })
})
