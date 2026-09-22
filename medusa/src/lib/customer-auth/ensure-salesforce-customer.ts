import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import { firstWorkflowError } from "../workflow-failure"
import SalesforceSyncModuleService from "../../modules/salesforce-sync/service"
import { pullCustomerFromSalesforceWorkflow } from "../../workflows/salesforce/pull-customer-salesforce"
import {
  assertValidEmail,
  getCustomerByEmail,
  type MedusaContainer,
} from "./helpers"

/**
 * Resolve a Salesforce Person Account Contact Id by email (no Medusa side effects).
 * Returns null when Salesforce is unavailable or the contact does not exist.
 */
export async function salesforcePersonContactIdByEmail(
  container: MedusaContainer,
  email: string
): Promise<string | null> {
  const normalized = assertValidEmail(email)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  try {
    if (!(await sync.isIntegrationReady())) return null
    return await sync.findContactIdByEmail(normalized)
  } catch (err) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
      warn: (msg: string) => void
    }
    logger.warn(
      `[customer-auth] Salesforce contact lookup failed for ${normalized}: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
    return null
  }
}

/**
 * Ensure a Medusa customer exists for a Salesforce Person Account email.
 * Creates the customer via SF pull when missing. Returns customer id or null.
 */
export async function ensureMedusaCustomerFromSalesforce(
  container: MedusaContainer,
  email: string
): Promise<string | null> {
  const normalized = assertValidEmail(email)
  const existing = await getCustomerByEmail(container, normalized)
  if (existing) return existing.id

  const salesforceId = await salesforcePersonContactIdByEmail(container, normalized)
  if (!salesforceId) return null

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    info: (msg: string) => void
    warn: (msg: string) => void
  }

  try {
    const ret = await pullCustomerFromSalesforceWorkflow(container).run({
      input: { salesforceId },
      throwOnError: false,
    })
    const failure = firstWorkflowError(ret)
    const medusaId = ret.result?.medusaId

    if (failure || !medusaId) {
      const message = failure?.message ?? "Workflow failed"
      logger.warn(
        `[customer-auth] Salesforce import failed for ${normalized} (${salesforceId}): ${message}`
      )
      return null
    }

    logger.info(
      `[customer-auth] imported Medusa customer ${medusaId} from Salesforce ${salesforceId} (${normalized})`
    )
    return medusaId
  } catch (err) {
    logger.warn(
      `[customer-auth] Salesforce import error for ${normalized}: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
    return null
  }
}
