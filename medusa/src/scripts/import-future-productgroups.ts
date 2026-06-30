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
 *   npm run salesforce:import-all -- --concurrency=4
 *   npx medusa exec ./src/scripts/import-future-productgroups.ts -- --dry-run --limit=5
 *   npx medusa exec ./src/scripts/import-future-productgroups.ts -- --linked-vathuis --dry-run
 *   npx medusa exec ./src/scripts/import-future-productgroups.ts -- --all --dry-run --limit=5
 *   npx medusa exec ./src/scripts/import-future-productgroups.ts -- --all --skip-search --concurrency=4
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { importProductgroupFromSalesforce } from "../modules/salesforce-sync/import-productgroup"
import type { SfProductgroupShape } from "../modules/salesforce-sync/mappings/productgroup"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import {
  shouldBulkImportProductgroup,
  shouldLinkedVathuisBulkImport,
} from "../modules/salesforce-sync/utils/future-import-guard"
import {
  linkedRecordsForGroup,
  prefetchProductgroupsForImport,
} from "../modules/salesforce-sync/utils/prefetch-productgroups-for-import"
import { runPool } from "../modules/salesforce-sync/utils/run-pool"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

type ImportCandidate = {
  group: SfProductgroupShape
}

type ImportOutcome = "imported" | "skipped" | "failed"

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
      (dryRun ? " (dry-run)" : "") +
      (limit ? ` (limit=${limit})` : "") +
      (concurrency > 1 ? ` (concurrency=${concurrency})` : "") +
      (skipSearch ? " (skip-search)" : "")
  )

  const previousSuppressPush = process.env.SALESFORCE_SUPPRESS_PUSH
  if (!dryRun) {
    process.env.SALESFORCE_SUPPRESS_PUSH = "1"
  }

  try {
    const prefetch = await prefetchProductgroupsForImport()
    logger.info(
      `[${logTag}] Prefetched ${prefetch.groups.length} group(s), ${prefetch.linkedOnlineSlaveIds.size} linked-online slave catalog(s)`
    )

    let skipped = 0
    const candidates: ImportCandidate[] = []

    for (const group of prefetch.groups) {
      if (!group.Id) continue

      const { children } = linkedRecordsForGroup(prefetch, group)

      const guardInput = {
        group,
        children,
        isLinkedOnlineSlave: prefetch.linkedOnlineSlaveIds.has(group.Id),
      }

      const shouldImport = importAll
        ? true
        : linkedVathuisOnly
          ? shouldLinkedVathuisBulkImport(guardInput)
          : shouldBulkImportProductgroup(guardInput)

      if (!shouldImport) {
        skipped++
        continue
      }

      if (limit && candidates.length >= limit) break
      candidates.push({ group })
    }

    if (dryRun) {
      for (const { group } of candidates) {
        const label = group.Name?.trim() || group.Id
        logger.info(`[${logTag}] would import ${label} (${group.Id})`)
      }
      logger.info(
        `[${logTag}] Done. would import=${candidates.length} skipped=${skipped} (scanned ${prefetch.groups.length} groups)`
      )
      return
    }

    const reindexProductIds: string[] = []

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
        })

        if (result.skipped) {
          logger.warn(
            `[${logTag}] skipped ${label} (${salesforceId}): ${result.skipReason ?? "skipped"}`
          )
          return "skipped" as ImportOutcome
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
    const failed = outcomes.filter((o) => o === "failed").length
    skipped += outcomes.filter((o) => o === "skipped").length

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
      `[${logTag}] Done. imported=${imported} skipped=${skipped} failed=${failed} (scanned ${prefetch.groups.length} groups)`
    )
  } finally {
    if (previousSuppressPush === undefined) {
      delete process.env.SALESFORCE_SUPPRESS_PUSH
    } else {
      process.env.SALESFORCE_SUPPRESS_PUSH = previousSuppressPush
    }
  }
}
