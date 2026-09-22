/**
 * Remap EventGroup.record_type from Medusa product.type using mapSalesforceRecordType.
 * Applies aliases (Live_Collegereeks → collegereeks, Excursies_Collegereeks → excursie,
 * Online_Studiedag → studiedag) without a full Salesforce re-import.
 *
 *   npx medusa exec ./src/scripts/backfill-event-group-record-types.ts
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productEventGroupLink from "../links/product-event-group"
import type EventsModuleService from "../modules/events/service"
import { mapSalesforceRecordType } from "../modules/salesforce-sync/mappings/productgroup"
import { flushStorefrontRedisCache } from "../lib/store-listing-redis"
import { revalidateStorefrontPlpCache } from "../lib/storefront-revalidate"

export default async function backfillEventGroupRecordTypes({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const events = container.resolve("events") as InstanceType<typeof EventsModuleService>

  const { data: links } = await query.graph({
    entity: productEventGroupLink.entryPoint,
    fields: ["product_id", "event_group.id", "event_group.record_type"],
  })

  const productIds = [
    ...new Set(
      (links ?? [])
        .map((row) => (row as { product_id?: string }).product_id)
        .filter(Boolean) as string[]
    ),
  ]

  const typeByProductId = new Map<string, string | null>()
  const chunkSize = 200
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize)
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "type.value"],
      filters: { id: chunk },
    })
    for (const row of products ?? []) {
      const product = row as { id?: string; type?: { value?: string } | null }
      if (!product.id) continue
      typeByProductId.set(product.id, product.type?.value ?? null)
    }
  }

  const counts = new Map<string, number>()
  let updated = 0
  let unchanged = 0

  for (const row of links ?? []) {
    const typed = row as {
      product_id?: string
      event_group?: { id?: string; record_type?: string }
    }
    const groupId = typed.event_group?.id
    const current = typed.event_group?.record_type
    if (!groupId || !typed.product_id) continue

    const next = mapSalesforceRecordType(typeByProductId.get(typed.product_id))
    if (current === next) {
      unchanged++
      continue
    }

    await events.updateEventGroups({ id: groupId, record_type: next })
    updated++
    const key = `${current ?? "?"}→${next}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  logger.info(`[backfill-record-types] updated=${updated} unchanged=${unchanged}`)
  for (const [key, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    logger.info(`  ${key}: ${n}`)
  }

  const flushed = await flushStorefrontRedisCache()
  if (flushed.redis) {
    logger.info(`[backfill-record-types] flushed ${flushed.deleted} storefront Redis key(s)`)
  } else {
    logger.warn("[backfill-record-types] REDIS_URL not set — in-memory listing cache only")
  }
  await revalidateStorefrontPlpCache()
  logger.info("[backfill-record-types] run `npm run search:reindex` if OpenSearch is in use")
}
