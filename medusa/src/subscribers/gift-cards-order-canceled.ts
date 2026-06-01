import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import GiftCardModuleService from "../modules/gift-card/service"
import { GIFT_CARD_MODULE } from "../modules/gift-card"

/**
 * Restore gift-card balances used on a canceled order; void freshly issued cards if still unused.
 */
export default async function giftCardsOnOrderCanceled({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderId = data.id
  const gift = container.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>

  try {
    await gift.reverseRedemptionsForOrder(orderId)
    await gift.cancelIssuedCardsForOrder(orderId)
    logger.info(`[gift-card] reversed / canceled gift card state for order ${orderId}`)
  } catch (err) {
    logger.error(`[gift-card] order cancel hook failed: ${(err as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
