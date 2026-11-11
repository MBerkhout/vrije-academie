import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { sentrySubscriber } from "../lib/subscriber-sentry"

import { withSubscriberPerf } from "../lib/subscriber-perf"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { pushFavouritesToSalesforceWorkflowId } from "../workflows/salesforce/push-favourites-salesforce"
import { salesforceIntegrationReady } from "../lib/salesforce-integration-sentry"
import { runSalesforceWorkflow } from "../workflows/salesforce/report-failure"

async function salesforceSyncFavourites({
  event: { data, name },
  container,
}: SubscriberArgs<{ id: string }>) {
  await withSubscriberPerf(name, "salesforce-sync-favourites", async () => {
    const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    if (!(await salesforceIntegrationReady(sync, { subscriber: "salesforce-sync-favourites" }))) return
    const id = data.id
    await runSalesforceWorkflow(
      container,
      pushFavouritesToSalesforceWorkflowId,
      { customerId: id },
      {
        eventGroupId: `${id}:favourites`,
        entityType: "customer",
        medusaId: id,
      }
    )
  })
}

export const config: SubscriberConfig = {
  event: ["customer.updated"],
}

export default sentrySubscriber("salesforce-sync-favourites", salesforceSyncFavourites)
