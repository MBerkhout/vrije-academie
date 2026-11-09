import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../service"
import { pullCustomerFromSalesforceWorkflowId } from "../../../workflows/salesforce/pull-customer-salesforce"
import { runSalesforceWorkflow } from "../../../workflows/salesforce/report-failure"

/** Idempotent sync-state row before pull (login + sync-from-salesforce can run in parallel). */
export async function ensureCustomerPullSyncState(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  customerId: string,
  salesforceId: string
): Promise<void> {
  let row = await sync.getStateByMedusaId("customer", customerId)
  if (!row) {
    try {
      await sync.createSalesforceSyncStates([
        {
          entity_type: "customer",
          medusa_id: customerId,
          salesforce_id: salesforceId,
          last_status: "queued",
        },
      ])
      return
    } catch {
      row = await sync.getStateByMedusaId("customer", customerId)
      if (!row) throw new Error(`Could not create salesforce_sync_state for customer ${customerId}`)
    }
  }

  const currentSf = row.salesforce_id?.trim() || ""
  if (currentSf !== salesforceId) {
    await sync.updateSalesforceSyncStates({
      id: row.id,
      salesforce_id: salesforceId,
      last_status: row.last_status === "success" ? "success" : "queued",
    })
  }
}

/**
 * Enqueue a Salesforce → Medusa customer pull (login refresh / email link).
 * Non-blocking; failures are recorded in salesforce_sync_state.
 */
export async function enqueueCustomerPullFromSalesforce(
  container: MedusaContainer,
  customerId: string,
  email: string
): Promise<void> {
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  if (!(await sync.isIntegrationReady())) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const existingRow = await sync.getStateByMedusaId("customer", customerId)
  let salesforceId = existingRow?.salesforce_id?.trim() || null

  if (!salesforceId) {
    salesforceId = await sync.findContactIdByEmail(email.trim().toLowerCase())
  }

  if (salesforceId) {
    await ensureCustomerPullSyncState(sync, customerId, salesforceId)
  }

  if (!salesforceId) {
    logger.debug(
      `[salesforce-sync] login pull skipped — no Salesforce Contact for customer ${customerId}`
    )
    return
  }

  await runSalesforceWorkflow(
    container,
    pullCustomerFromSalesforceWorkflowId,
    { medusaId: customerId, salesforceId },
    { eventGroupId: customerId, entityType: "customer", medusaId: customerId }
  )
  logger.info(`[salesforce-sync] enqueued login pull customer ${customerId} ← SF ${salesforceId}`)
}
