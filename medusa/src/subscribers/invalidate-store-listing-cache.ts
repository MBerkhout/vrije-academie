import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"

import { invalidateStoreListingCache } from "../lib/store-listing-redis"

/**
 * Bust Redis + in-memory PLP/agenda/registration caches when catalog or orders change.
 */
export default async function invalidateStoreListingCacheSubscriber(
  _args: SubscriberArgs<{ id: string }>
): Promise<void> {
  await invalidateStoreListingCache()
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
