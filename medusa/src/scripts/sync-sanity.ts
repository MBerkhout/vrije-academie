import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import CatalogModuleService from "../modules/catalog/service"
import PeopleModuleService from "../modules/people/service"
import {
  mirrorCategory,
  mirrorCity,
  mirrorDocent,
} from "../modules/sanity-sync/service"
import { syncProductCategoryById } from "../modules/sanity-sync/sync-product-category-by-id"
import { syncProductById } from "../modules/sanity-sync/sync-product-by-id"

/**
 * Full resync of Medusa → Sanity mirrored documents.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/sync-sanity.ts
 *   npx medusa exec ./src/scripts/sync-sanity.ts -- --entity=categories
 *   npx medusa exec ./src/scripts/sync-sanity.ts -- --entity=catalog-categories
 *   npx medusa exec ./src/scripts/sync-sanity.ts -- --entity=docenten
 *   npx medusa exec ./src/scripts/sync-sanity.ts -- --entity=products
 */
export default async function syncSanity({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const args = process.argv.slice(2)
  const entityArg = args.find((a) => a.startsWith("--entity="))?.split("=")[1] ?? "all"
  const entities = entityArg === "all"
    ? ["categories", "catalog-categories", "cities", "docenten", "products"]
    : [entityArg]

  logger.info(`[sync-sanity] Starting resync for: ${entities.join(", ")}`)

  if (entities.includes("categories")) {
    const { data: productCategories } = await query.graph({
      entity: "product_category",
      fields: ["id"],
    })
    const ids = (productCategories ?? []).map((c: { id: string }) => c.id).filter(Boolean)
    logger.info(`[sync-sanity] Syncing ${ids.length} product categories…`)
    for (const id of ids) {
      await syncProductCategoryById(id, container)
    }
    logger.info(`[sync-sanity] Product categories done.`)
  }

  if (entities.includes("catalog-categories")) {
    const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>
    const categories = await catalog.listCategories({})
    logger.info(`[sync-sanity] Syncing ${categories.length} catalog categories…`)
    for (const cat of categories) {
      await mirrorCategory(cat)
    }
    logger.info(`[sync-sanity] Catalog categories done.`)
  }

  if (entities.includes("cities")) {
    const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>
    const cities = await catalog.listCities({})
    logger.info(`[sync-sanity] Syncing ${cities.length} catalog cities…`)
    for (const city of cities) {
      await mirrorCity(city)
    }
    logger.info(`[sync-sanity] Catalog cities done.`)
  }

  if (entities.includes("docenten")) {
    const people = container.resolve("people") as InstanceType<typeof PeopleModuleService>
    const docenten = await people.listDocents({})
    logger.info(`[sync-sanity] Syncing ${docenten.length} docenten…`)
    for (const doc of docenten) {
      await mirrorDocent(doc as any)
    }
    logger.info(`[sync-sanity] Docenten done.`)
  }

  if (entities.includes("products")) {
    const { data: allProducts } = await query.graph({
      entity: "product",
      fields: ["id"],
    })

    const productIds = (allProducts ?? []).map((p: { id: string }) => p.id).filter(Boolean)

    if (!productIds.length) {
      logger.info(`[sync-sanity] No products found.`)
    } else {
      logger.info(`[sync-sanity] Syncing ${productIds.length} product(s)…`)
      let failed = 0

      for (const id of productIds) {
        try {
          await syncProductById(id, container)
        } catch (err) {
          failed += 1
          const message = err instanceof Error ? err.message : String(err)
          logger.warn(`[sync-sanity] Failed to sync product ${id}: ${message}`)
        }
      }

      logger.info(
        `[sync-sanity] Products done (${productIds.length - failed} ok${failed ? `, ${failed} failed` : ""}).`
      )
    }
  }

  logger.info(`[sync-sanity] Resync complete.`)
}
