import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SearchModuleService from "../modules/search/service"

/**
 * Re-index docent/category/city entity docs when catalog or people data changes.
 */
export default async function syncSearchCatalogEntitiesSubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<Record<string, unknown>>): Promise<void> {
  const search = container.resolve("search") as InstanceType<typeof SearchModuleService>
  if (!search.isEnabled()) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const id = String(data.id ?? "")
  if (!id) return

  try {
    if (name === "catalog.category.deleted" || name === "people.docent.deleted" || name === "catalog.city.deleted") {
      const prefix =
        name === "catalog.category.deleted"
          ? "category"
          : name === "catalog.city.deleted"
            ? "city"
            : "docent"
      await search.deleteDoc(`${prefix}-${id}`)
      return
    }

    if (name === "catalog.category.created" || name === "catalog.category.updated") {
      await search.reindexCatalogEntity("category", {
        id,
        slug: data.slug as string | undefined,
        label: data.label as string | undefined,
      })
      return
    }

    if (name === "catalog.city.created" || name === "catalog.city.updated") {
      await search.reindexCatalogEntity("city", {
        id,
        slug: data.slug as string | undefined,
        label: data.label as string | undefined,
      })
      return
    }

    if (name === "people.docent.created" || name === "people.docent.updated") {
      await search.reindexCatalogEntity("docent", {
        id,
        slug: data.slug as string | undefined,
        name: data.name as string | undefined,
        role: data.role as string | undefined,
        bio: data.bio as string | undefined,
        subject_tags: data.subject_tags,
      })
    }
  } catch (err) {
    logger.warn(`Search catalog entity sync failed for ${name}: ${String(err)}`)
  }
}

export const config: SubscriberConfig = {
  event: [
    "catalog.category.created",
    "catalog.category.updated",
    "catalog.category.deleted",
    "catalog.city.created",
    "catalog.city.updated",
    "catalog.city.deleted",
    "people.docent.created",
    "people.docent.updated",
    "people.docent.deleted",
  ],
}
