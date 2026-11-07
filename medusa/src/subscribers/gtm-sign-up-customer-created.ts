import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { buildGtmSignUpPayload } from "../lib/gtm/build-sign-up-payload"
import {
  GTM_SIGN_UP_SENT_AT,
  hasCustomerMetadataFlag,
  markCustomerMetadataFlag,
} from "../lib/gtm/idempotency"
import { isSgtmEnabled } from "../lib/gtm/sgtm-config"
import { sendSgtmEventWithRetry } from "../lib/gtm/send-sgtm-event"

const ANALYTICS_SIGN_UP_EVENT_ID = "analytics_sign_up_event_id"

/**
 * Server-side sign_up for Stape (website registration only).
 * Skips customers without analytics_sign_up_event_id (Salesforce import / legacy).
 */
export default async function gtmSignUpOnCustomerCreated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!isSgtmEnabled()) {
    return
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const customerId = data.id
  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "metadata"],
  })
  const metadata = (customer.metadata ?? {}) as Record<string, unknown>
  if (typeof metadata[ANALYTICS_SIGN_UP_EVENT_ID] !== "string") {
    logger.info(`[gtm-sign-up] skip ${customerId} (no storefront event id)`)
    return
  }

  try {
    if (await hasCustomerMetadataFlag(container, customerId, GTM_SIGN_UP_SENT_AT)) {
      logger.info(`[gtm-sign-up] skip ${customerId} already sent`)
      return
    }

    const payload = await buildGtmSignUpPayload(container, customerId)
    await sendSgtmEventWithRetry(payload)
    await markCustomerMetadataFlag(container, customerId, GTM_SIGN_UP_SENT_AT)
    logger.info(`[gtm-sign-up] sent ${customerId}`)
  } catch (err) {
    logger.warn(
      `[gtm-sign-up] failed ${customerId}: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
