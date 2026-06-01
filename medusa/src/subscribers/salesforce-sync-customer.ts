import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { pushCustomerToSalesforceWorkflowId } from "../workflows/salesforce/push-customer-salesforce"
import { runSalesforceWorkflow } from "../workflows/salesforce/report-failure"

export default async function salesforceSyncCustomer({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  if (!(await sync.isIntegrationReady())) return
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const id = data.id
  await runSalesforceWorkflow(container, pushCustomerToSalesforceWorkflowId, { customerId: id }, {
    eventGroupId: id,
    entityType: "customer",
    medusaId: id,
  })
  logger.info(`[salesforce-sync] enqueued push customer ${id}`)
}

export const config: SubscriberConfig = {
  event: ["customer.created", "customer.updated"],
}
