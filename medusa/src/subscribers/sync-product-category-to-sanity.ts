import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { deleteDoc } from "../modules/sanity-sync/service"
import { syncProductCategoryById } from "../modules/sanity-sync/sync-product-category-by-id"
import { isSanitySyncSuppressed } from "../modules/salesforce-sync/utils/suppress-sanity-sync"

/**
 * Mirror a native Medusa product category to Sanity when created, updated, or deleted.
 */
async function syncProductCategoryToSanity({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_WRITE_TOKEN) return
  if (name !== "product-category.deleted" && isSanitySyncSuppressed()) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const categoryId = data.id

  if (name === "product-category.deleted") {
    await deleteDoc(`medusa-category-${categoryId}`)
    logger.info(`[sanity-sync] deleted product category ${categoryId}`)
    return
  }

  try {
    await syncProductCategoryById(categoryId, container)
    logger.info(`[sanity-sync] synced product category ${categoryId}`)
  } catch (err) {
    logger.error(
      `[sanity-sync] failed to sync product category ${categoryId}: ${(err as Error).message}`
    )
  }
}

export default syncProductCategoryToSanity

export const config: SubscriberConfig = {
  event: ["product-category.created", "product-category.updated", "product-category.deleted"],
}
