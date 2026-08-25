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
): Promise<string | null> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["handle", "status"],
    filters: { id: productId },
  })
  const row = data?.[0] as { handle?: string | null; status?: string | null } | undefined
  const handle = row?.handle
  if (handle) await invalidateEventDetailCache(handle)
  return row?.status ?? null
}

/**
 * PLP hard cache (10 min) is busted immediately when a product in the first-page
 * slots is updated; other product updates wait for TTL expiry. Drafting a product
 * always busts listings so Agenda cannot keep serving the unpublished occurrence.
 */
export async function handleProductCatalogChange(
  scope: MedusaContainer,
  eventName: string,
  productId: string
): Promise<void> {
  const status = await invalidateEventDetailForProductId(scope, productId)

  if (eventName === "product.created" || eventName === "product.deleted") {
    await invalidateStoreListingCache()
    await revalidateStorefrontPlpCache()
    return
  }

  if (eventName === "product.updated") {
    const unpublished = !!status && status !== "published"
    if (unpublished || (await isProductInCachedPlpTopSlots(productId))) {
      await invalidateStoreListingCache()
      await revalidateStorefrontPlpCache()
    }
  }
}

export async function handleOrderCatalogChange(): Promise<void> {
  await invalidateRegistrationCountsCache()
}
