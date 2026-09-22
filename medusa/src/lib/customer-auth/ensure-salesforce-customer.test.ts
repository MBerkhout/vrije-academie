import { beforeEach, describe, expect, it, vi } from "vitest"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const mockRun = vi.fn()
vi.mock("../../workflows/salesforce/pull-customer-salesforce", () => ({
  pullCustomerFromSalesforceWorkflow: vi.fn(() => ({
    run: mockRun,
  })),
}))

import { pullCustomerFromSalesforceWorkflow } from "../../workflows/salesforce/pull-customer-salesforce"
import {
  ensureMedusaCustomerFromSalesforce,
  salesforcePersonContactIdByEmail,
} from "./ensure-salesforce-customer"

function makeContainer(opts: {
  integrationReady?: boolean
  contactId?: string | null
  sfLookupThrows?: boolean
  existingCustomer?: { id: string } | null
}) {
  const findContactIdByEmail = opts.sfLookupThrows
    ? vi.fn().mockRejectedValue(new Error("SF down"))
    : vi.fn().mockResolvedValue(opts.contactId ?? null)

  const listAndCountCustomers = vi.fn().mockResolvedValue([
    opts.existingCustomer ? [opts.existingCustomer] : [],
    opts.existingCustomer ? 1 : 0,
  ])

  const logger = { warn: vi.fn(), info: vi.fn() }

  return {
    resolve: (key: string) => {
      if (key === "salesforceSync") {
        return {
          isIntegrationReady: vi
            .fn()
            .mockResolvedValue(opts.integrationReady ?? true),
          findContactIdByEmail,
        }
      }
      if (key === Modules.CUSTOMER) {
        return { listAndCountCustomers }
      }
      if (key === ContainerRegistrationKeys.LOGGER) {
        return logger
      }
      throw new Error(`Unexpected resolve: ${key}`)
    },
    logger,
    findContactIdByEmail,
    listAndCountCustomers,
  }
}

describe("salesforcePersonContactIdByEmail", () => {
  it("returns null when Salesforce is not configured", async () => {
    const container = makeContainer({ integrationReady: false })
    const result = await salesforcePersonContactIdByEmail(container, "user@example.com")
    expect(result).toBeNull()
  })

  it("returns Contact Id when Salesforce has a Person Account", async () => {
    const container = makeContainer({ contactId: "003ABC" })
    const result = await salesforcePersonContactIdByEmail(container, "User@Example.com")
    expect(result).toBe("003ABC")
    expect(container.findContactIdByEmail).toHaveBeenCalledWith("user@example.com")
  })

  it("returns null and logs when Salesforce lookup fails", async () => {
    const container = makeContainer({ sfLookupThrows: true })
    const result = await salesforcePersonContactIdByEmail(container, "user@example.com")
    expect(result).toBeNull()
    expect(container.logger.warn).toHaveBeenCalled()
  })
})

describe("ensureMedusaCustomerFromSalesforce", () => {
  beforeEach(() => {
    mockRun.mockReset()
    vi.mocked(pullCustomerFromSalesforceWorkflow).mockClear()
  })

  it("returns existing Medusa customer id without calling Salesforce pull", async () => {
    const container = makeContainer({ existingCustomer: { id: "cus_existing" } })
    const result = await ensureMedusaCustomerFromSalesforce(container, "user@example.com")
    expect(result).toBe("cus_existing")
    expect(pullCustomerFromSalesforceWorkflow).not.toHaveBeenCalled()
  })

  it("returns null when email is not in Medusa or Salesforce", async () => {
    const container = makeContainer({ contactId: null })
    const result = await ensureMedusaCustomerFromSalesforce(container, "unknown@example.com")
    expect(result).toBeNull()
    expect(mockRun).not.toHaveBeenCalled()
  })

  it("imports from Salesforce and returns medusaId on success", async () => {
    const container = makeContainer({ contactId: "003ABC" })
    mockRun.mockResolvedValue({
      result: { medusaId: "cus_new", created: true },
      errors: [],
      thrownError: undefined,
    })

    const result = await ensureMedusaCustomerFromSalesforce(container, "user@example.com")
    expect(result).toBe("cus_new")
    expect(pullCustomerFromSalesforceWorkflow).toHaveBeenCalledWith(container)
    expect(mockRun).toHaveBeenCalledWith({
      input: { salesforceId: "003ABC" },
      throwOnError: false,
    })
  })

  it("returns null when Salesforce pull workflow fails", async () => {
    const container = makeContainer({ contactId: "003ABC" })
    mockRun.mockResolvedValue({
      result: undefined,
      errors: [{ error: new Error("pull failed") }],
      thrownError: undefined,
    })

    const result = await ensureMedusaCustomerFromSalesforce(container, "user@example.com")
    expect(result).toBeNull()
    expect(container.logger.warn).toHaveBeenCalled()
  })
})
