import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { completeOrderWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Event registrations are digital — no physical fulfillment step.
 * When payment is captured the order is placed (status pending); complete it
 * immediately so order.completed subscribers run (SF sync, seat decrement).
 */
export default async function autoCompleteOrderOnPlaced({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderId = data.id
  const orderModule = container.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(orderId, { select: ["id", "status"] })

  if (order.status === "completed") {
    logger.info(`[auto-complete-order] skip ${orderId} already completed`)
    return
  }
  if (order.status === "canceled") {
    logger.info(`[auto-complete-order] skip ${orderId} canceled`)
    return
  }

  await completeOrderWorkflow(container).run({
    input: { orderIds: [orderId] },
  })
  logger.info(`[auto-complete-order] completed ${orderId}`)
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
