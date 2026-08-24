import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { processPendingSalesforceWebhookEvents } from "../modules/salesforce-sync/process-webhook-events"

export default async function processSalesforceWebhookQueueJob(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    await processPendingSalesforceWebhookEvents(container)
  } catch (err) {
    logger.error(
      `[salesforce-sync] scheduled webhook queue job failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

/** Runs every minute; immediate fire-and-forget handles most webhook traffic. */
export const config = {
  name: "process-salesforce-webhook-queue",
  schedule: "* * * * *",
}
