import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../service"
import { pushCustomerToSalesforceWorkflowId } from "../../../workflows/salesforce/push-customer-salesforce"
import { runSalesforceWorkflow } from "../../../workflows/salesforce/report-failure"

/**
 * Enqueue a Medusa → Salesforce customer push (registration, address change, etc.).
 * Non-blocking; failures are recorded in salesforce_sync_state.
 */
export async function enqueueCustomerPushToSalesforce(
  container: MedusaContainer,
  customerId: string,
  options?: { isCreate?: boolean }
): Promise<void> {
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  if (!(await sync.isIntegrationReady())) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  await runSalesforceWorkflow(
    container,
    pushCustomerToSalesforceWorkflowId,
    { customerId, isCreate: options?.isCreate },
    { eventGroupId: customerId, entityType: "customer", medusaId: customerId }
  )
  logger.info(`[salesforce-sync] enqueued push customer ${customerId}`)
}
