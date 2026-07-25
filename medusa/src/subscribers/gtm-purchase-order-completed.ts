import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  buildGtmPurchasePayload,
  hasGtmPurchaseBeenSent,
  markGtmPurchaseSent,
} from "../lib/gtm/build-purchase-payload"
import { sendSgtmPurchaseEventWithRetry } from "../lib/gtm/send-sgtm-event"

/**
 * Server-side purchase event for sGTM (not browser dataLayer).
 * Idempotent via order.metadata.gtm_purchase_sent_at.
 */
export default async function gtmPurchaseOnOrderCompleted({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!process.env.SGTM_ENDPOINT_URL?.trim()) {
    return
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderId = data.id

  try {
    if (await hasGtmPurchaseBeenSent(container, orderId)) {
      logger.info(`[gtm-purchase] skip ${orderId} already sent`)
      return
    }

    const payload = await buildGtmPurchasePayload(container, orderId)
    await sendSgtmPurchaseEventWithRetry(payload)
    await markGtmPurchaseSent(container, orderId)
    logger.info(`[gtm-purchase] sent ${orderId} tx=${payload.transaction_id}`)
  } catch (err) {
    logger.warn(
      `[gtm-purchase] failed ${orderId}: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.completed",
}
