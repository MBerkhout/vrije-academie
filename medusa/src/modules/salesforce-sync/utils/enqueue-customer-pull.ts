import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../service"
import { pullCustomerFromSalesforceWorkflowId } from "../../../workflows/salesforce/pull-customer-salesforce"
import { runSalesforceWorkflow } from "../../../workflows/salesforce/report-failure"

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
  let row = await sync.getStateByMedusaId("customer", customerId)
  let salesforceId = row?.salesforce_id?.trim() || null

  if (!salesforceId) {
    salesforceId = await sync.findContactIdByEmail(email.trim().toLowerCase())
    if (salesforceId && !row) {
      await sync.createSalesforceSyncStates([
        {
          entity_type: "customer",
          medusa_id: customerId,
          salesforce_id: salesforceId,
          last_status: "queued",
        },
      ])
    } else if (salesforceId && row && !row.salesforce_id) {
      await sync.updateSalesforceSyncStates({
        id: row.id,
        salesforce_id: salesforceId,
        last_status: "queued",
      })
    }
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
