import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import variantEventItemLink from "../links/variant-event-item"
import EventsModuleService from "../modules/events/service"

/**
 * When a Medusa order is completed, decrement `EventItem.available_quantity`
 * (business "Product" / purchasable event instance) by each line item quantity.
 * No cart reservation — inventory module is not used for this field.
 */
export default async function decrementAvailableQuantityOnOrderCompleted({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderModule = container.resolve(Modules.ORDER)
  const eventsModule = container.resolve("events") as InstanceType<
    typeof EventsModuleService
  >
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const orderId = data.id
  const order = await orderModule.retrieveOrder(orderId, {
    relations: ["items"],
  })

  const items = order.items ?? []
  for (const lineItem of items) {
    const variantId = lineItem.variant_id
    if (!variantId) {
      continue
    }

    const qty = typeof lineItem.quantity === "number" ? lineItem.quantity : 0
    if (qty <= 0) {
      continue
    }

    const { data: linkRows } = await query.graph({
      entity: variantEventItemLink.entryPoint,
      fields: ["*", "event_item.*"],
      filters: {
        product_variant_id: variantId,
      },
    })

    const row = linkRows?.[0] as
      | { event_item?: { id: string; available_quantity?: number } }
      | undefined
    const eventItem = row?.event_item
    if (!eventItem?.id) {
      continue
    }

    const current = Number(eventItem.available_quantity ?? 0)
    const next = Math.max(0, current - qty)

    await eventsModule.updateEventItems({
      id: eventItem.id,
      available_quantity: next,
    })

    logger.info(
      `[events] order.completed: variant ${variantId} event_item ${eventItem.id} available_quantity ${current} -> ${next} (qty ${qty})`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.completed",
}
