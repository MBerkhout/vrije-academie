import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import CatalogModuleService from "../modules/catalog/service"
import EventsModuleService from "../modules/events/service"
import { resolveOrCreateCity } from "../lib/resolve-city"

/**
 * Backfill canonical catalog_city rows from existing event_item.city values
 * and set event_item.city_slug on each row.
 *
 * Run: medusa exec ./src/scripts/backfill-cities.ts
 */
export default async function backfillCities({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const events = container.resolve("events") as InstanceType<typeof EventsModuleService>

  const eventItems = await events.listEventItems({}, { take: 10000 })
  let created = 0
  let updated = 0

  for (const item of eventItems) {
    const label = item.city?.trim()
    if (!label) continue

    const resolved = await resolveOrCreateCity(catalog, label)
    if (!resolved) continue

    if (!item.city_slug || item.city_slug !== resolved.slug || item.city !== resolved.label) {
      await events.updateEventItems({
        id: item.id,
        city: resolved.label,
        city_slug: resolved.slug,
      })
      updated++
    }
  }

  const allCities = await catalog.listCities({}, { take: 1000 })
  created = allCities.length

  logger.info(
    `[backfill-cities] Done. ${created} canonical cities, ${updated} event items updated.`
  )
}
