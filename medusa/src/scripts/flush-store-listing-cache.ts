import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  flushStorefrontRedisCache,
  STOREFRONT_REDIS_KEY_PATTERNS,
} from "../lib/store-listing-redis"
import { revalidateStorefrontPlpCache } from "../lib/storefront-revalidate"

/**
 * Drop Ons aanbod / Agenda / VA Thuis listing snapshots and event-detail Redis keys.
 * Does not flush Medusa workflow or job keys.
 *
 * Run: npm run cache:flush
 * Must use the same REDIS_URL as the Medusa server.
 */
export default async function flushStoreListingCache({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const result = await flushStorefrontRedisCache()

  if (!result.redis) {
    logger.warn(
      "REDIS_URL is not set — only this process's in-memory listing cache was cleared. " +
        "Set REDIS_URL to the same Redis as the Medusa server and run again."
    )
    return
  }

  logger.info(
    `Flushed ${result.deleted} storefront Redis key(s) (${STOREFRONT_REDIS_KEY_PATTERNS.join(", ")}).`
  )
  const listingKeys = result.keys.filter((key) => key.startsWith("store:listing:")).sort()
  const detailCount = result.keys.filter((key) => key.startsWith("store:event:detail:")).length
  for (const key of listingKeys) {
    logger.info(`  deleted ${key}`)
  }
  if (detailCount) {
    logger.info(`  deleted ${detailCount} event-detail key(s)`)
  }
  if (!result.keys.length) {
    logger.info("No matching keys were present.")
  }

  await revalidateStorefrontPlpCache()
}
