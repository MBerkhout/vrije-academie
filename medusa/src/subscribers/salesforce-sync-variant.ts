import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { pushVariantToSalesforceWorkflowId } from "../workflows/salesforce/push-variant-salesforce"
import { runSalesforceWorkflow } from "../workflows/salesforce/report-failure"

export default async function salesforceSyncVariantCreated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  if (!(await sync.isIntegrationReady())) return
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const id = data.id
  await runSalesforceWorkflow(container, pushVariantToSalesforceWorkflowId, { variantId: id }, {
    eventGroupId: id,
    entityType: "variant",
    medusaId: id,
  })
  logger.info(`[salesforce-sync] enqueued push variant ${id}`)
}

export const config: SubscriberConfig = {
  event: "product-variant.created",
}
