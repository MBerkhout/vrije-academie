import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { pushProductToSalesforceWorkflowId } from "../workflows/salesforce/push-product-salesforce"
import { runSalesforceWorkflow } from "../workflows/salesforce/report-failure"

/** `product.created` only — updates are not pushed back per project rules; Sanity handles updates. */
export default async function salesforceSyncProductCreated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  if (!(await sync.isIntegrationReady())) return
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const id = data.id
  await runSalesforceWorkflow(container, pushProductToSalesforceWorkflowId, { productId: id }, {
    eventGroupId: id,
    entityType: "product",
    medusaId: id,
  })
  logger.info(`[salesforce-sync] enqueued push product ${id}`)
}

export const config: SubscriberConfig = {
  event: "product.created",
}
