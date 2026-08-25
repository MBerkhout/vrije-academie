/**
 * Bulk-import Salesforce product groups (vaProductgroup__c + children).
 *
 * Default: future / VAthuis / linked-online / online-only (see shouldBulkImportProductgroup).
 * --linked-vathuis: VAthuis + linked-online parents and slave catalogs only (fast backfill).
 * --all: every product group since the beginning (manual import, bypasses date guard).
 *
 *   npm run salesforce:import-future
 *   npm run salesforce:import-linked-vathuis
 *   npm run salesforce:import-all
 *   npm run salesforce:import-all -- --concurrency=5
 *   npm run salesforce:import-all -- --since=2026-03-01T00:00:00.000Z
 *   npm run salesforce:import-all -- --skip-unchanged --concurrency=8
 *   npx medusa exec ./src/scripts/import-future-productgroups.ts -- --dry-run --limit=5
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { importProductgroupFromSalesforce } from "../modules/salesforce-sync/import-productgroup"
import type { SfProductgroupShape } from "../modules/salesforce-sync/mappings/productgroup"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { shouldEnqueueBulkProductgroup } from "../modules/salesforce-sync/utils/future-import-guard"
import { isProductgroupVisibleOnWebsite } from "../modules/salesforce-sync/utils/visible-on-website"
import {
  BulkImportContext,
  parseSinceArg,
  prefetchLinkedOnlineParentIdsBySlave,
} from "../modules/salesforce-sync/utils/import-context"
import {
  linkedRecordsForGroup,
  mergeSalesforceIdsIntoPrefetch,
  prefetchProductgroupsForImport,
} from "../modules/salesforce-sync/utils/prefetch-productgroups-for-import"
import { runPool } from "../modules/salesforce-sync/utils/run-pool"
import { batchSyncProductsToSanity } from "../modules/sanity-sync/batch-sync-products"
import { batchSyncRelatedEntitiesToSanity } from "../modules/sanity-sync/batch-sync-related-entities"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

type ImportCandidate = {
  group: SfProductgroupShape
}

type ImportOutcome = "imported" | "skipped" | "hidden" | "failed"

export default async function importFutureProductgroups({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  if (!(await sync.isIntegrationReady())) {
    logger.error("[import-future-productgroups] Salesforce not configured. See docs/SALESFORCE_SYNC.md.")
    return
  }

  const dryRun = process.argv.includes("--dry-run")
  const importAll = process.argv.includes("--all")
  const linkedVathuisOnly = process.argv.includes("--linked-vathuis")
  const skipSearch = process.argv.includes("--skip-search")
  const skipUnchanged = process.argv.includes("--skip-unchanged")
  const since = parseSinceArg(arg("--since"))
  const limit = Math.min(5000, Math.max(0, Number(arg("--limit")) || 0))
  const concurrency = Math.min(20, Math.max(1, Number(arg("--concurrency")) || 1))
  const logTag = importAll
    ? "import-all-productgroups"
    : linkedVathuisOnly
      ? "import-linked-vathuis"
      : "import-future-productgroups"

  logger.info(
    `[${logTag}] Prefetching product groups…` +
      (importAll
        ? " (all groups)"
        : linkedVathuisOnly
          ? " (VAthuis + linked-online only)"
          : " (future / VAthuis / linked-online / online-only)") +
      (since ? ` (since=${since.toISOString()})` : "") +
      (dryRun ? " (dry-run)" : "") +
      (limit ? ` (limit=${limit})` : "") +
      (concurrency > 1 ? ` (concurrency=${concurrency})` : "") +
      (skipSearch ? " (skip-search)" : "") +
      (skipUnchanged ? " (skip-unchanged)" : "")
  )

  const previousSuppressPush = process.env.SALESFORCE_SUPPRESS_PUSH
  const previousSuppressSanity = process.env.SALESFORCE_SUPPRESS_SANITY_SYNC
  if (!dryRun) {
    process.env.SALESFORCE_SUPPRESS_PUSH = "1"
    process.env.SALESFORCE_SUPPRESS_SANITY_SYNC = "1"
  }

  try {
    const [prefetch, linkedOnlineParentIdsBySlave] = await Promise.all([
      prefetchProductgroupsForImport(since ? { since } : {}),
      prefetchLinkedOnlineParentIdsBySlave(),
    ])
    logger.info(
      `[${logTag}] Prefetched ${prefetch.groups.length} group(s), ${prefetch.linkedOnlineSlaveIds.size} linked-online slave catalog(s)`
    )

    const importContext = await BulkImportContext.create(container, sync, {
      skipSanitySync: true,
      skipUnchanged,
      linkedOnlineParentIdsBySlave,
    })
    const extraImported = await mergeSalesforceIdsIntoPrefetch(
      prefetch,
      importContext.importedSalesforceIds()
    )
    if (extraImported) {
      logger.info(
        `[${logTag}] Loaded ${extraImported} already-imported group(s) missing from prefetch (visibility cleanup)`
      )
    }

    let skipped = 0
    const candidates: ImportCandidate[] = []

    for (const group of prefetch.groups) {
      if (!group.Id) continue

      const { children } = linkedRecordsForGroup(prefetch, group)

      const shouldImport = shouldEnqueueBulkProductgroup(
        {
          group,
          children,
          isLinkedOnlineSlave: prefetch.linkedOnlineSlaveIds.has(group.Id),
        },
        {
          importAll,
          linkedVathuisOnly,
          alreadyImported: Boolean(importContext.getProductgroupState(group.Id)?.medusa_id),
        }
      )

      if (!shouldImport) {
        skipped++
        continue
      }

      if (limit && candidates.length >= limit) break
      candidates.push({ group })
    }

    if (dryRun) {
      let wouldHide = 0
      for (const { group } of candidates) {
        const label = group.Name?.trim() || group.Id
        const { children } = linkedRecordsForGroup(prefetch, group)
        if (!isProductgroupVisibleOnWebsite(group)) {
          wouldHide++
          logger.info(`[${logTag}] would hide ${label} (${group.Id}) (not visible on website)`)
        } else {
          logger.info(`[${logTag}] would import ${label} (${group.Id})`)
        }
      }
      logger.info(
        `[${logTag}] Done. would import=${candidates.length - wouldHide} would hide=${wouldHide} skipped=${skipped} (scanned ${prefetch.groups.length} groups)`
      )
      return
    }

    const reindexProductIds: string[] = []
    const sanitySyncProductIds: string[] = []

    const outcomes = await runPool(candidates, concurrency, async ({ group }) => {
      const salesforceId = group.Id!
      const label = group.Name?.trim() || salesforceId
      const { children, linkedGroupRecord, linkedChildRecords } = linkedRecordsForGroup(
        prefetch,
        group
      )

      try {
        const result = await importProductgroupFromSalesforce(container, {
          salesforceId,
          groupRecord: group,
          childRecords: children,
          linkedGroupRecord,
          linkedChildRecords,
          manual: true,
          skipSearch,
          skipSanitySync: true,
          importContext,
        })

        if (result.skipped) {
          if (result.skipReason === "not_visible_on_website" && result.medusaId) {
            logger.info(
              `[${logTag}] hid ${label} (${salesforceId}) → ${result.medusaId} (not visible on website)`
            )
            return "hidden" as ImportOutcome
          }
          logger.warn(
            `[${logTag}] skipped ${label} (${salesforceId}): ${result.skipReason ?? "skipped"}`
          )
          return "skipped" as ImportOutcome
        }

        if (result.medusaId) {
          sanitySyncProductIds.push(result.medusaId)
        }
        if (skipSearch && result.medusaId) {
          reindexProductIds.push(result.medusaId)
        }
        logger.info(`[${logTag}] imported ${label} (${salesforceId}) → ${result.medusaId}`)
        return "imported" as ImportOutcome
      } catch (err) {
        logger.error(
          `[${logTag}] failed ${label} (${salesforceId}): ${err instanceof Error ? err.message : String(err)}`
        )
        return "failed" as ImportOutcome
      }
    })

    const imported = outcomes.filter((o) => o === "imported").length
    const hidden = outcomes.filter((o) => o === "hidden").length
    const failed = outcomes.filter((o) => o === "failed").length
    skipped += outcomes.filter((o) => o === "skipped").length

    if (sanitySyncProductIds.length) {
      logger.info(`[${logTag}] Batch-syncing ${sanitySyncProductIds.length} product(s) to Sanity…`)
      const sanityResult = await batchSyncProductsToSanity(sanitySyncProductIds, container, {
        onChunkError: (chunkIds, err) => {
          logger.error(
            `[${logTag}] Sanity batch sync failed for ${chunkIds.length} product(s): ${err.message}`
          )
        },
      })
      logger.info(
        `[${logTag}] Sanity products done. written=${sanityResult.written} skipped=${sanityResult.skipped} failed=${sanityResult.failed}`
      )
    }

    const relatedIds = {
      catalogCategoryIds: [...importContext.pendingCatalogCategoryIds],
      nativeCategoryIds: [...importContext.pendingNativeCategoryIds],
      docentIds: [...importContext.pendingDocentIds],
    }
    if (
      relatedIds.catalogCategoryIds.length ||
      relatedIds.nativeCategoryIds.length ||
      relatedIds.docentIds.length
    ) {
      logger.info(
        `[${logTag}] Batch-syncing related Sanity entities: catalog=${relatedIds.catalogCategoryIds.length} native=${relatedIds.nativeCategoryIds.length} docenten=${relatedIds.docentIds.length}`
      )
      const relatedResult = await batchSyncRelatedEntitiesToSanity(container, {
        ...relatedIds,
        onError: (entity, id, err) => {
          logger.warn(`[${logTag}] Sanity ${entity} ${id} failed: ${err.message}`)
        },
      })
      logger.info(
        `[${logTag}] Sanity related done. catalog=${relatedResult.catalogCategories} native=${relatedResult.nativeCategories} docenten=${relatedResult.docenten} failed=${relatedResult.failed}`
      )
    }

    if (skipSearch && reindexProductIds.length) {
      const search = container.resolve("search") as import("../modules/search/service").default
      if (search.isEnabled()) {
        logger.info(`[${logTag}] Reindexing ${reindexProductIds.length} product(s) in search…`)
        for (const productId of reindexProductIds) {
          await search.reindexProductById(container, productId).catch(() => undefined)
        }
      }
    }

    logger.info(
      `[${logTag}] Done. imported=${imported} hid=${hidden} skipped=${skipped} failed=${failed} (scanned ${prefetch.groups.length} groups)`
    )
  } finally {
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
  }
}
