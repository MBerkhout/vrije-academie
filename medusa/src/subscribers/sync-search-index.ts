import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import SearchModuleService from "../modules/search/service"

async function resolveProductIdFromVariant(
  container: SubscriberArgs<{ id: string }>["container"],
  variantId: string
): Promise<string | null> {
  try {
    const productModule = container.resolve(Modules.PRODUCT)
    const variant = await productModule.retrieveProductVariant(variantId)
    return variant.product_id ?? null
  } catch {
    return null
  }
}

/**
 * Keep the OpenSearch unified index in sync with Medusa catalog changes.
 */
export default async function syncSearchIndexSubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string; product_id?: string }>): Promise<void> {
  const search = container.resolve("search") as InstanceType<typeof SearchModuleService>
  if (!search.isEnabled()) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    if (name === "product.deleted") {
      await search.deleteDoc(`product-${data.id}`)
      return
    }

    if (name === "product.created" || name === "product.updated") {
      await search.reindexProductById(container, data.id)
      return
    }

    if (name === "product-variant.created" || name === "product-variant.updated") {
      const productId = await resolveProductIdFromVariant(container, data.id)
      if (productId) {
        await search.reindexProductById(container, productId)
      }
    }
  } catch (err) {
    logger.warn(`Search index sync failed for ${name}: ${String(err)}`)
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.created",
    "product-variant.updated",
  ],
}
