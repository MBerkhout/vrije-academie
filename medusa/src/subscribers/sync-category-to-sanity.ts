import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import CatalogModuleService from "../modules/catalog/service"
import { mirrorCategory, deleteDoc } from "../modules/sanity-sync/service"

/**
 * Mirror a catalog Category to Sanity when created, updated, or deleted.
 */
async function syncCategoryToSanity({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_WRITE_TOKEN) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const categoryId = data.id

  if (name === "catalog.category.deleted") {
    await deleteDoc(`medusa-category-${categoryId}`)
    logger.info(`[sanity-sync] deleted category ${categoryId}`)
    return
  }

  try {
    const [category] = await catalog.listCategories({ id: categoryId })
    if (!category) return
    await mirrorCategory(category)
    logger.info(`[sanity-sync] synced category ${categoryId}`)
  } catch (err) {
    logger.error(`[sanity-sync] failed to sync category ${categoryId}: ${(err as Error).message}`)
  }
}

export default syncCategoryToSanity

export const config: SubscriberConfig = {
  event: ["catalog.category.created", "catalog.category.updated", "catalog.category.deleted"],
}
