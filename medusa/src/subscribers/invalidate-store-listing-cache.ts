import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"

import {
  handleOrderCatalogChange,
  handleProductCatalogChange,
} from "../lib/store-listing-invalidation"

/**
 * Smart cache busting for PLP hard cache (10 min) and event detail cache.
 * - product.created/deleted → full listing cache bust
 * - product.updated → listing bust only when product is on the first PLP page
 * - order.* → registration counts only (default PLP sort is Salesforce order)
 */
export default async function invalidateStoreListingCacheSubscriber({
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
