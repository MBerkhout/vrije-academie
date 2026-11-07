import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { sentrySubscriber } from "../lib/subscriber-sentry"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { withSubscriberPerf } from "../lib/subscriber-perf"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { isSalesforcePushSuppressed } from "../modules/salesforce-sync/utils/suppress-push"
import { pushVariantToSalesforceWorkflowId } from "../workflows/salesforce/push-variant-salesforce"
import { salesforceIntegrationReady } from "../lib/salesforce-integration-sentry"
import { runSalesforceWorkflow } from "../workflows/salesforce/report-failure"

async function salesforceSyncVariantCreated({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await withSubscriberPerf(name, "salesforce-sync-variant", async () => {
    if (isSalesforcePushSuppressed()) return
    const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    if (!(await salesforceIntegrationReady(sync, { subscriber: "salesforce-sync-variant" }))) return
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const id = data.id
    await runSalesforceWorkflow(container, pushVariantToSalesforceWorkflowId, { variantId: id }, {
      eventGroupId: id,
      entityType: "variant",
      medusaId: id,
    })
    logger.info(`[salesforce-sync] enqueued push variant ${id}`)
  })
}

export const config: SubscriberConfig = {
  event: "product-variant.created",
}

export default sentrySubscriber("salesforce-sync-variant", salesforceSyncVariantCreated)
