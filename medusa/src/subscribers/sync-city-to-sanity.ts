import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import CatalogModuleService from "../modules/catalog/service"
import { mirrorCity, deleteDoc } from "../modules/sanity-sync/service"

/**
 * Mirror a catalog City to Sanity when created, updated, or deleted.
 */
async function syncCityToSanity({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_WRITE_TOKEN) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const cityId = data.id

  if (name === "catalog.city.deleted") {
    await deleteDoc(`medusa-city-${cityId}`)
    logger.info(`[sanity-sync] deleted city ${cityId}`)
    return
  }

  try {
    const [city] = await catalog.listCities({ id: cityId })
    if (!city) return
    await mirrorCity(city)
    logger.info(`[sanity-sync] synced city ${cityId}`)
  } catch (err) {
    logger.error(`[sanity-sync] failed to sync city ${cityId}: ${(err as Error).message}`)
  }
}

export default syncCityToSanity

export const config: SubscriberConfig = {
  event: ["catalog.city.created", "catalog.city.updated", "catalog.city.deleted"],
}
