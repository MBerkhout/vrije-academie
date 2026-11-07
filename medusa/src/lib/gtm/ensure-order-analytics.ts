import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { parseOrderAnalyticsMetadata } from "./parse-analytics-metadata"

/** Copy cart.metadata.analytics onto the order when checkout did not propagate it. */
export async function ensureOrderAnalyticsFromCart(
  container: MedusaContainer,
  orderId: string
): Promise<void> {
  const orderModule = container.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(orderId, { select: ["id", "metadata"] })
  const metadata = (order.metadata ?? {}) as Record<string, unknown>
  if (parseOrderAnalyticsMetadata(metadata).event_id) return

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: rows } = await query.graph({
    entity: "order",
    fields: ["id", "metadata", "cart.id", "cart.metadata"],
    filters: { id: orderId },
  })
  const row = rows?.[0] as Record<string, unknown> | undefined
  const cart = row?.cart as { metadata?: Record<string, unknown> } | undefined
  const cartAnalytics = cart?.metadata?.analytics
  if (!cartAnalytics || typeof cartAnalytics !== "object") return

  await orderModule.updateOrders(orderId, {
    metadata: {
      ...metadata,
      analytics: cartAnalytics,
    },
  })
}
