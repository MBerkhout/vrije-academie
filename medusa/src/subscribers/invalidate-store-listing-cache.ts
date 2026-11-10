import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { sentrySubscriber } from "../lib/subscriber-sentry"

import {
  handleOrderCatalogChange,
  handleProductCatalogChange,
} from "../lib/store-listing-invalidation"
import { Modules } from "@medusajs/framework/utils"
import { isImportedSalesforceOrder } from "../modules/salesforce-sync/utils/order-import-metadata"

/**
 * Smart cache busting for PLP hard cache (10 min) and event detail cache.
 * - product.created/deleted → full listing cache bust
 * - product.updated → listing bust only when product is on the first PLP page
 * - order.* → registration counts only (default PLP sort is Salesforce order)
 */
async function invalidateStoreListingCacheSubscriber({
  event,
  container,
}: SubscriberArgs<{ id: string }>): Promise<void> {
  const name = event.name

  if (
    name === "product.created" ||
    name === "product.updated" ||
    name === "product.deleted"
  ) {
    const productId = event.data?.id
    if (!productId) return
    await handleProductCatalogChange(container, name, productId)
    return
  }

  if (name === "order.completed" || name === "order.placed") {
    const orderId = event.data?.id
    if (orderId) {
      const orderModule = container.resolve(Modules.ORDER)
      const order = await orderModule.retrieveOrder(orderId, { select: ["id", "metadata"] })
      if (isImportedSalesforceOrder(order.metadata as Record<string, unknown> | null)) {
        return
      }
    }
    await handleOrderCatalogChange()
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "order.completed",
    "order.placed",
  ],
}

export default sentrySubscriber("invalidate-store-listing-cache", invalidateStoreListingCacheSubscriber)
