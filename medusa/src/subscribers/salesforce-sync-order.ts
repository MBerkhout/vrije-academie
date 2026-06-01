import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { pushOrderToSalesforceWorkflowId } from "../workflows/salesforce/push-order-salesforce"
import { runSalesforceWorkflow } from "../workflows/salesforce/report-failure"

/**
 * Push when order reaches completed (paid) — aligns with inventory decrement subscriber.
 */
export default async function salesforceSyncOrderCompleted({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  if (!(await sync.isIntegrationReady())) return
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderModule = container.resolve(Modules.ORDER)
  const id = data.id
  const order = await orderModule.retrieveOrder(id)
  if (order.status !== "completed") {
    logger.info(`[salesforce-sync] skip order ${id} status=${order.status}`)
    return
  }
  await runSalesforceWorkflow(container, pushOrderToSalesforceWorkflowId, { orderId: id }, {
    eventGroupId: id,
    entityType: "order",
    medusaId: id,
  })
  logger.info(`[salesforce-sync] enqueued push order ${id}`)
}

export const config: SubscriberConfig = {
  event: "order.completed",
}
