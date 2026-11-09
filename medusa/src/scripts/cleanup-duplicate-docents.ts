import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productDocentenLink from "../links/product-docenten"
import type PeopleModuleService from "../modules/people/service"
import type SalesforceSyncModuleService from "../modules/salesforce-sync/service"

/**
 * Removes legacy test docents (slug contains `testdocent`) that duplicate a real docent by name.
 * A docent is only deleted when ALL of these hold:
 *   - slug matches /testdocent/
 *   - no products are linked
 *   - another docent with the same name exists
 * Duplicates that are linked to products (e.g. Birgitte Mommers' test profile, Dick Duijst, ...) are only reported.
 * Deleting fires `people.docent.deleted`, so the Sanity document `medusa-docent-<id>` is removed as well.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/cleanup-duplicate-docents.ts          # report only
 *   npx medusa exec ./src/scripts/cleanup-duplicate-docents.ts -- --fix # apply
 */
export default async function cleanupDuplicateDocents({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const people = container.resolve("people") as InstanceType<typeof PeopleModuleService>
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const apply = process.argv.includes("--fix")

  const docents = await people.listDocents({}, { take: null })
  const { data: links } = await query.graph({
    entity: productDocentenLink.entryPoint,
    fields: ["docent_id", "product_id"],
  })
  const productCount = new Map<string, number>()
  for (const l of (links ?? []) as { docent_id?: string }[]) {
    if (l.docent_id) productCount.set(l.docent_id, (productCount.get(l.docent_id) ?? 0) + 1)
  }

  const byName = new Map<string, typeof docents>()
  for (const d of docents) {
    const key = d.name.trim().toLowerCase()
    byName.set(key, [...(byName.get(key) ?? []), d])
  }

  const toDelete: { id: string; name: string; slug: string }[] = []
  for (const group of byName.values()) {
    if (group.length < 2) continue
    for (const d of group) {
      const n = productCount.get(d.id) ?? 0
      const isTest = /testdocent/i.test(d.slug)
      const remove = isTest && n === 0
      logger.info(
        `[cleanup-docents] ${d.name} | ${d.slug} | products=${n} | ${remove ? "DELETE" : "keep"}`
      )
      if (remove) toDelete.push({ id: d.id, name: d.name, slug: d.slug })
    }
  }

  logger.info(`[cleanup-docents] ${toDelete.length} docent(s) to delete.`)
  if (!apply) {
    if (toDelete.length) logger.info("[cleanup-docents] Dry run — re-run with -- --fix to apply.")
    return
  }

  for (const d of toDelete) {
    const state = await sync.getStateByMedusaId("docent", d.id)
    if (state) await sync.deleteSalesforceSyncStates(state.id)
    await people.deleteDocents(d.id)
    logger.info(`[cleanup-docents] deleted ${d.name} (${d.slug})`)
  }
  logger.info("[cleanup-docents] Done.")
}
