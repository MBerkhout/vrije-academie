import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import * as Sentry from "@sentry/node"

import { captureWithContext } from "../lib/sentry"
import { processPendingSalesforceWebhookEvents } from "../modules/salesforce-sync/process-webhook-events"

export default async function processSalesforceWebhookQueueJob(container: MedusaContainer) {
  await Sentry.withMonitor(
    "process-salesforce-webhook-queue",
    async () => {
      const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
      try {
        await processPendingSalesforceWebhookEvents(container)
      } catch (err) {
        logger.error(
          `[salesforce-sync] scheduled webhook queue job failed: ${err instanceof Error ? err.message : String(err)}`
        )
        captureWithContext(err, {
          tags: { kind: "job", job: "process-salesforce-webhook-queue", flow: "salesforce-sync" },
        })
      }
    },
    { schedule: { type: "crontab", value: "* * * * *" } }
  )
}

/** Runs every minute; immediate fire-and-forget handles most webhook traffic. */
export const config = {
  name: "process-salesforce-webhook-queue",
  schedule: "* * * * *",
}
