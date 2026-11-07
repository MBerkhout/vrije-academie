import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { sentrySubscriber } from "../lib/subscriber-sentry"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { buildGtmRefundPayload } from "../lib/gtm/build-refund-payload"
import { GTM_REFUND_SENT_AT, hasOrderMetadataFlag, markOrderMetadataFlag } from "../lib/gtm/idempotency"
import { isSgtmEnabled } from "../lib/gtm/sgtm-config"
import { sendSgtmEventWithRetry } from "../lib/gtm/send-sgtm-event"
import { isImportedSalesforceOrder } from "../modules/salesforce-sync/utils/order-import-metadata"

/**
 * Server-side refund event for sGTM when an order is canceled.
 * Idempotent via order.metadata.gtm_refund_sent_at.
 */
async function gtmRefundOnOrderCanceled({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!isSgtmEnabled()) {
    return
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderId = data.id
  const orderModule = container.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(orderId, { select: ["id", "metadata"] })
  if (isImportedSalesforceOrder(order.metadata as Record<string, unknown> | null)) {
    logger.info(`[gtm-refund] skip imported Salesforce order ${orderId}`)
    return
  }

  try {
    if (await hasOrderMetadataFlag(container, orderId, GTM_REFUND_SENT_AT)) {
      logger.info(`[gtm-refund] skip ${orderId} already sent`)
      return
    }

    const payload = await buildGtmRefundPayload(container, orderId)
    await sendSgtmEventWithRetry(payload)
    await markOrderMetadataFlag(container, orderId, GTM_REFUND_SENT_AT)
    logger.info(`[gtm-refund] sent ${orderId} tx=${payload.transaction_id}`)
  } catch (err) {
    logger.warn(
      `[gtm-refund] failed ${orderId}: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}

export default sentrySubscriber("gtm-refund-order-canceled", gtmRefundOnOrderCanceled)
