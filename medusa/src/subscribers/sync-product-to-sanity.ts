import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { deleteDoc } from "../modules/sanity-sync/service"
import { syncProductById } from "../modules/sanity-sync/sync-product-by-id"

async function syncProductToSanity({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_WRITE_TOKEN) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productId = data.id

  if (name === "product.deleted") {
    await deleteDoc(`medusa-product-${productId}`)
    logger.info(`[sanity-sync] deleted product ${productId}`)
    return
  }

  try {
    await syncProductById(productId, container)
    logger.info(`[sanity-sync] synced product ${productId}`)
  } catch (err) {
    logger.error(`[sanity-sync] failed to sync product ${productId}: ${(err as Error).message}`)
  }
}

export default syncProductToSanity

export const config: SubscriberConfig = {
  // product.created is handled by salesforce workflow (includes Sanity after SF); keep updated/deleted here.
  event: ["product.updated", "product.deleted"],
}
