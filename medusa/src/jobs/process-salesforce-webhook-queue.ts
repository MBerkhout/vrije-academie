import type { MedusaContainer } from "@medusajs/framework/types"

import { withCronMonitor } from "../lib/sentry"
import { processPendingSalesforceWebhookEvents } from "../modules/salesforce-sync/process-webhook-events"
import { reportWebhookQueueBacklogIfNeeded } from "../modules/salesforce-sync/utils/webhook-queue-sentry"

export default async function processSalesforceWebhookQueueJob(container: MedusaContainer) {
  await withCronMonitor("process-salesforce-webhook-queue", "* * * * *", async () => {
    await processPendingSalesforceWebhookEvents(container)
    await reportWebhookQueueBacklogIfNeeded(container)
  })
}

/** Runs every minute; immediate fire-and-forget handles most webhook traffic. */
export const config = {
  name: "process-salesforce-webhook-queue",
  schedule: "* * * * *",
}
