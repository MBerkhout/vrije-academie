/**
 * Benchmark bulk import + batched Sanity sync vs one-by-one Sanity sync.
 *
 *   npx medusa exec ./src/scripts/benchmark-bulk-import.ts -- --limit=30 --concurrency=5
 *   npx medusa exec ./src/scripts/benchmark-bulk-import.ts -- --limit=30 --compare-legacy-sanity=10
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { batchSyncProductsToSanity } from "../modules/sanity-sync/batch-sync-products"
import {
  getSanityCallMetrics,
  isSanityConfigured,
  resetSanityCallMetrics,
} from "../modules/sanity-sync/sanity-client"
import { syncProductById } from "../modules/sanity-sync/sync-product-by-id"
import { importProductgroupFromSalesforce } from "../modules/salesforce-sync/import-productgroup"
import type { SfProductgroupShape } from "../modules/salesforce-sync/mappings/productgroup"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import {
  BulkImportContext,
  prefetchLinkedOnlineParentIdsBySlave,
} from "../modules/salesforce-sync/utils/import-context"
import {
  linkedRecordsForGroup,
  prefetchProductgroupsForImport,
} from "../modules/salesforce-sync/utils/prefetch-productgroups-for-import"
import { runPool } from "../modules/salesforce-sync/utils/run-pool"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

function ms(start: number): number {
  return Math.round(performance.now() - start)
}

function totalSanityCalls(m = getSanityCallMetrics()): number {
  return m.fetchCalls + m.mutateTransactions + m.createOrReplaceCalls + m.deleteCalls
}

function formatMetrics(label: string, m = getSanityCallMetrics()): string {
  return (
    `${label}: fetch=${m.fetchCalls} mutateTx=${m.mutateTransactions} ` +
    `createOrReplace=${m.createOrReplaceCalls} delete=${m.deleteCalls} total=${totalSanityCalls(m)}`
  )
}

export default async function benchmarkBulkImport({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  if (!(await sync.isIntegrationReady())) {
    logger.error("[benchmark-bulk-import] Salesforce not configured.")
    return
  }

  const limit = Math.min(200, Math.max(1, Number(arg("--limit")) || 30))
  const concurrency = Math.min(20, Math.max(1, Number(arg("--concurrency")) || 5))
  const compareLegacy = Math.min(limit, Math.max(0, Number(arg("--compare-legacy-sanity")) || 0))

  logger.info(
    `[benchmark-bulk-import] Starting limit=${limit} concurrency=${concurrency}` +
      (compareLegacy ? ` compareLegacySanity=${compareLegacy}` : "")
  )

  const prefetchStart = performance.now()
  const [prefetch, linkedOnlineParentIdsBySlave] = await Promise.all([
    prefetchProductgroupsForImport(),
    prefetchLinkedOnlineParentIdsBySlave(),
  ])
  const prefetchMs = ms(prefetchStart)

  const candidates: SfProductgroupShape[] = []
  for (const group of prefetch.groups) {
    if (!group.Id) continue
    candidates.push(group)
    if (candidates.length >= limit) break
  }

  logger.info(
    `[benchmark-bulk-import] Prefetch ${prefetchMs}ms — using first ${candidates.length} of ${prefetch.groups.length} groups`
  )

  const previousSuppressPush = process.env.SALESFORCE_SUPPRESS_PUSH
  const previousSuppressSanity = process.env.SALESFORCE_SUPPRESS_SANITY_SYNC
  process.env.SALESFORCE_SUPPRESS_PUSH = "1"
  process.env.SALESFORCE_SUPPRESS_SANITY_SYNC = "1"

  const importContext = await BulkImportContext.create(container, sync, {
    skipSanitySync: true,
    linkedOnlineParentIdsBySlave,
  })

  const productIds: string[] = []
  const importStart = performance.now()

  await runPool(candidates, concurrency, async (group) => {
    const salesforceId = group.Id!
    const { children, linkedGroupRecord, linkedChildRecords } = linkedRecordsForGroup(
      prefetch,
      group
    )

    const result = await importProductgroupFromSalesforce(container, {
      salesforceId,
      groupRecord: group,
      childRecords: children,
      linkedGroupRecord,
      linkedChildRecords,
      manual: true,
      skipSearch: true,
      skipSanitySync: true,
      importContext,
    })

    if (!result.skipped && result.medusaId) {
      productIds.push(result.medusaId)
    }
  })

  const importMs = ms(importStart)
  resetSanityCallMetrics()

  let batchMs = 0
  let batchResult = { attempted: 0, written: 0, skipped: 0, failed: 0 }

  if (isSanityConfigured() && productIds.length) {
    const batchStart = performance.now()
    batchResult = await batchSyncProductsToSanity(productIds, container)
    batchMs = ms(batchStart)
  }

  const batchMetrics = getSanityCallMetrics()
  const batchSanityCalls = totalSanityCalls(batchMetrics)

  logger.info(`[benchmark-bulk-import] Medusa import: ${importMs}ms for ${productIds.length} products`)
  logger.info(
    `[benchmark-bulk-import]   → ${(importMs / Math.max(productIds.length, 1)).toFixed(0)}ms per product (SF+Medusa only)`
  )
  logger.info(
    `[benchmark-bulk-import] Batched Sanity: ${batchMs}ms — written=${batchResult.written} skipped=${batchResult.skipped} failed=${batchResult.failed}`
  )
  logger.info(`[benchmark-bulk-import]   → ${formatMetrics("Sanity calls")}`)
  logger.info(
    `[benchmark-bulk-import]   → ${(batchMs / Math.max(productIds.length, 1)).toFixed(0)}ms Sanity per product (amortized over batch)`
  )
  logger.info(
    `[benchmark-bulk-import]   → ${(batchSanityCalls / Math.max(productIds.length, 1)).toFixed(2)} Sanity HTTP calls per product`
  )

  const legacyEstimateCallsPerProduct = 4
  logger.info(
    `[benchmark-bulk-import] Old approach estimate: ~${legacyEstimateCallsPerProduct} Sanity calls/product × ${productIds.length} = ~${legacyEstimateCallsPerProduct * productIds.length} calls (no batching, incl. duplicate subscriber)`
  )
  logger.info(
    `[benchmark-bulk-import] Sanity call reduction: ~${Math.round((1 - batchSanityCalls / Math.max(legacyEstimateCallsPerProduct * productIds.length, 1)) * 100)}% vs old estimate`
  )

  if (compareLegacy > 0 && isSanityConfigured()) {
    const legacyIds = productIds.slice(0, compareLegacy)
    resetSanityCallMetrics()
    const legacyStart = performance.now()
    for (const id of legacyIds) {
      await syncProductById(id, container)
    }
    const legacyMs = ms(legacyStart)
    const legacyMetrics = getSanityCallMetrics()
    const legacyCalls = totalSanityCalls(legacyMetrics)

    logger.info(
      `[benchmark-bulk-import] Legacy one-by-one Sanity (sample n=${legacyIds.length}): ${legacyMs}ms`
    )
    logger.info(`[benchmark-bulk-import]   → ${formatMetrics("Sanity calls")}`)
    logger.info(
      `[benchmark-bulk-import]   → ${(legacyMs / legacyIds.length).toFixed(0)}ms per product, ${(legacyCalls / legacyIds.length).toFixed(1)} calls per product`
    )

    const projectedLegacyMs = (legacyMs / legacyIds.length) * productIds.length
    const projectedBatchMs = batchMs
    logger.info(
      `[benchmark-bulk-import] Projected Sanity time for ${productIds.length} products: batch=${projectedBatchMs}ms vs legacy≈${Math.round(projectedLegacyMs)}ms (${Math.round(projectedLegacyMs / Math.max(projectedBatchMs, 1))}× slower)`
    )
  }

  if (previousSuppressPush === undefined) {
    delete process.env.SALESFORCE_SUPPRESS_PUSH
  } else {
    process.env.SALESFORCE_SUPPRESS_PUSH = previousSuppressPush
  }
  if (previousSuppressSanity === undefined) {
    delete process.env.SALESFORCE_SUPPRESS_SANITY_SYNC
  } else {
    process.env.SALESFORCE_SUPPRESS_SANITY_SYNC = previousSuppressSanity
  }

  logger.info("[benchmark-bulk-import] Done.")
}
