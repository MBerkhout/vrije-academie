/**
 * Backfill session location/docent on event_item rows from Salesforce child data.
 * Targets published products with future offline sessions missing location or docent.
 *
 *   npm run salesforce:backfill-facets
 *   npm run salesforce:backfill-facets -- --concurrency=8
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { refreshEventItemsFromChildRows } from "../modules/salesforce-sync/import-productgroup"
import {
  courseProductSalesforceFieldsForPull,
  SF_COURSE_PRODUCT_OBJECT,
} from "../modules/salesforce-sync/mappings/course-product"
import {
  productgroupSalesforceFieldsForPull,
  SF_PRODUCTGROUP_OBJECT,
} from "../modules/salesforce-sync/mappings/productgroup"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { BulkImportContext } from "../modules/salesforce-sync/utils/import-context"
import { runPool } from "../modules/salesforce-sync/utils/run-pool"
import { prefetchLinkedOnlineParentIdsBySlave } from "../modules/salesforce-sync/utils/import-context"
import { mergeProductgroupChildRows } from "../modules/salesforce-sync/utils/linked-online-productgroup"
import { queryAllSalesforce } from "../modules/salesforce-sync/utils/query-all-salesforce"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

type Candidate = {
  salesforceId: string
  medusaId: string
  label: string
}

export default async function backfillEventItemFacets({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  if (!(await sync.isIntegrationReady())) {
    logger.error("[backfill-facets] Salesforce not configured.")
    return
  }

  process.env.SALESFORCE_SUPPRESS_PUSH = "1"
  process.env.SALESFORCE_SUPPRESS_SANITY_SYNC = "1"

  const concurrency = Math.min(20, Math.max(1, Number(arg("--concurrency")) || 8))
  const limit = Math.min(10000, Math.max(0, Number(arg("--limit")) || 0))
  const now = new Date()

  const pgStates = await sync.listSalesforceSyncStates({ entity_type: "productgroup" })
  const medusaToSf = new Map(
    pgStates
      .filter((row) => row.medusa_id && row.salesforce_id)
      .map((row) => [row.medusa_id!, row.salesforce_id!])
  )

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "variants.id",
      "variants.event_item.delivery_type",
      "variants.event_item.start_at",
      "variants.event_item.location_name",
      "variants.event_item.instructor_name",
      "variants.event_item.docent_id",
    ],
    filters: { status: "published" },
  })

  const needsBackfill = new Set<string>()

  for (const row of products ?? []) {
    const product = row as {
      id?: string
      title?: string
      variants?: Array<{
        event_item?: {
          delivery_type?: string | null
          start_at?: string | null
          location_name?: string | null
          instructor_name?: string | null
          docent_id?: string | null
        } | null
      }>
    }
    if (!product.id || !medusaToSf.has(product.id)) continue

    const futureOffline = (product.variants ?? [])
      .map((v) => v.event_item)
      .filter(Boolean)
      .filter((item) => {
        if (item!.delivery_type !== "offline") return false
        if (!item!.start_at) return true
        return new Date(item!.start_at as string) >= now
      })

    if (futureOffline.length === 0) continue

    const missing = futureOffline.some(
      (item) =>
        !item!.location_name?.trim() ||
        (!item!.instructor_name?.trim() && !item!.docent_id)
    )
    if (missing) needsBackfill.add(product.id)
  }

  let candidates: Candidate[] = [...needsBackfill]
    .map((medusaId) => {
      const salesforceId = medusaToSf.get(medusaId)!
      const title =
        (products as { id?: string; title?: string }[] | undefined)?.find((p) => p.id === medusaId)
          ?.title ?? medusaId
      return { salesforceId, medusaId, label: title }
    })

  if (limit) candidates = candidates.slice(0, limit)

  logger.info(
    `[backfill-facets] ${candidates.length} product(s) with missing session facets (concurrency=${concurrency})…`
  )

  const linkedOnlineParentIdsBySlave = await prefetchLinkedOnlineParentIdsBySlave()
  const childFields = courseProductSalesforceFieldsForPull.join(",")

  let refreshed = 0
  let skipped = 0
  let failed = 0
  let variantUpdates = 0

  await runPool(candidates, concurrency, async (candidate) => {
    try {
      const group = await sync.retrieve(SF_PRODUCTGROUP_OBJECT, candidate.salesforceId, [
        ...productgroupSalesforceFieldsForPull,
      ])
      const children = await queryAllSalesforce<Record<string, unknown>>(
        `SELECT ${childFields} FROM ${SF_COURSE_PRODUCT_OBJECT} WHERE Productgroup__c = '${candidate.salesforceId.replace(/'/g, "\\'")}' ORDER BY Start_date_time__c ASC`
      )
      const childRows = mergeProductgroupChildRows(
        children as never[],
        group.Productgroup_Record_Type_Developer_Name__c,
        [],
        null
      )
      const isLinkedOnlineSlave =
        (linkedOnlineParentIdsBySlave.get(candidate.salesforceId) ?? []).length > 0

      const importContext = await BulkImportContext.create(container, sync, {
        skipSanitySync: true,
        skipUnchanged: true,
        linkedOnlineParentIdsBySlave,
      })

      const variantIds = await refreshEventItemsFromChildRows(
        container,
        sync,
        candidate.medusaId,
        candidate.salesforceId,
        childRows,
        group,
        isLinkedOnlineSlave,
        importContext
      )

      if (variantIds.length === 0) {
        skipped++
        return
      }

      refreshed++
      variantUpdates += variantIds.length
      if (refreshed <= 20 || refreshed % 50 === 0) {
        logger.info(`[backfill-facets] refreshed ${candidate.label} (${variantIds.length} variants)`)
      }
    } catch (err) {
      failed++
      logger.error(
        `[backfill-facets] failed ${candidate.label}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  })

  logger.info(
    `[backfill-facets] Done. products=${refreshed} variant_updates=${variantUpdates} skipped=${skipped} failed=${failed}`
  )
}
