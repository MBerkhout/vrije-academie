import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  invalidateEventDetailCache,
  invalidateRegistrationCountsCache,
  invalidateStoreListingCache,
} from "./store-listing-redis"
import { isProductInCachedPlpTopSlots } from "./store-listing-snapshot"
import { revalidateStorefrontPlpCache } from "./storefront-revalidate"

export async function invalidateEventDetailForProductId(
  scope: MedusaContainer,
  productId: string
): Promise<void> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["handle"],
    filters: { id: productId },
  })
  const handle = (data?.[0] as { handle?: string | null })?.handle
  if (handle) await invalidateEventDetailCache(handle)
}

/**
 * PLP hard cache (10 min) is busted immediately when a product in the first-page
 * slots is updated; other product updates wait for TTL expiry.
 */
export async function handleProductCatalogChange(
  scope: MedusaContainer,
  eventName: string,
  productId: string
): Promise<void> {
  await invalidateEventDetailForProductId(scope, productId)

  if (eventName === "product.created" || eventName === "product.deleted") {
    await invalidateStoreListingCache()
    await revalidateStorefrontPlpCache()
    return
  }

  if (eventName === "product.updated") {
    if (await isProductInCachedPlpTopSlots(productId)) {
      await invalidateStoreListingCache()
      await revalidateStorefrontPlpCache()
    }
  }
}

export async function handleOrderCatalogChange(): Promise<void> {
  await invalidateRegistrationCountsCache()
}
