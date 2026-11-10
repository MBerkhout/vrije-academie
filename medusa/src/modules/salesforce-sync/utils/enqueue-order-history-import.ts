import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { importOrderHistorySalesforceWorkflowId } from "../../../workflows/salesforce/import-order-history-salesforce"
import { runSalesforceWorkflow } from "../../../workflows/salesforce/report-failure"
import SalesforceSyncModuleService from "../service"
import {
  CUSTOMER_SF_ORDER_HISTORY_STATUS,
  isCustomerOrderHistoryRunningStale,
  parseCustomerOrderHistoryStatus,
  patchCustomerOrderHistoryMetadata,
} from "./customer-order-history-metadata"
import { Modules } from "@medusajs/framework/utils"

/**
 * Fire-and-forget: import full Salesforce order history for the logged-in customer.
 */
export async function enqueueOrderHistoryImportFromSalesforce(
  container: MedusaContainer,
  customerId: string
): Promise<void> {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  if (!(await sync.isIntegrationReady())) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, { select: ["id", "metadata"] })
  const metadata = (customer.metadata ?? {}) as Record<string, unknown>
  const status = parseCustomerOrderHistoryStatus(metadata)

  if (status === "running" && !isCustomerOrderHistoryRunningStale(metadata)) {
    logger.debug(`[sf-order-history] skip enqueue — already running for ${customerId}`)
    return
  }

  if (!status || status === "failed" || isCustomerOrderHistoryRunningStale(metadata)) {
    await patchCustomerOrderHistoryMetadata(container, customerId, {
      [CUSTOMER_SF_ORDER_HISTORY_STATUS]: "pending",
    })
  }

  await runSalesforceWorkflow(
    container,
    importOrderHistorySalesforceWorkflowId,
    { customerId },
    { eventGroupId: `order-history:${customerId}`, entityType: "customer", medusaId: customerId }
  )
  logger.info(`[sf-order-history] enqueued import for customer ${customerId}`)
}
