/**
 * Re-import visible product groups whose remaining future sessions are online-only
 * (including linked-online catalogs), then rebuild PDP caches.
 *
 *   npm run salesforce:reimport-only-online
 *   npm run salesforce:reimport-only-online -- --dry-run
 *   npm run salesforce:reimport-only-online -- --only-empty-pdp
 *   npm run salesforce:reimport-only-online -- --limit=5
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { rebuildEventDetail } from "../lib/event-detail-rebuild"
import { buildStoreEventDetail } from "../lib/store-event-detail"
import { importProductgroupFromSalesforce } from "../modules/salesforce-sync/import-productgroup"
import type { SfProductgroupShape } from "../modules/salesforce-sync/mappings/productgroup"
import { sanitizeProductHandle } from "../modules/salesforce-sync/mappings/productgroup"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { onlyOnlineFutureSessionsRemain } from "../modules/salesforce-sync/utils/only-online-sessions"
import {
  linkedRecordsForGroup,
  mergedChildrenForImportGuard,
  prefetchProductgroupsForImport,
} from "../modules/salesforce-sync/utils/prefetch-productgroups-for-import"
import { isProductgroupVisibleOnWebsite } from "../modules/salesforce-sync/utils/visible-on-website"
import { isVathuisRecordType } from "../modules/salesforce-sync/clients/audience-player"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

function handleForGroup(group: SfProductgroupShape): string {
  const title = group.Name?.trim() || "product"
  return sanitizeProductHandle(
    group.Productgroup_URL__c,
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  )
}

export default async function reimportOnlyOnlineSessions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  if (!(await sync.isIntegrationReady())) {
    logger.error("[reimport-only-online] Salesforce not configured.")
    return
  }

  const dryRun = process.argv.includes("--dry-run")
  const onlyEmptyPdp = process.argv.includes("--only-empty-pdp")
  const limit = Math.min(5000, Math.max(0, Number(arg("--limit")) || 0))

  const previousSuppressPush = process.env.SALESFORCE_SUPPRESS_PUSH
  const previousSuppressSanity = process.env.SALESFORCE_SUPPRESS_SANITY_SYNC
  if (!dryRun) {
    process.env.SALESFORCE_SUPPRESS_PUSH = "1"
    process.env.SALESFORCE_SUPPRESS_SANITY_SYNC = "1"
  }

  try {
    const prefetch = await prefetchProductgroupsForImport({})
    const candidates: SfProductgroupShape[] = []

    for (const group of prefetch.groups) {
      if (!group.Id) continue
      if (!isProductgroupVisibleOnWebsite(group)) continue
      if (isVathuisRecordType(group.Productgroup_Record_Type_Developer_Name__c)) continue
      if (prefetch.linkedOnlineSlaveIds.has(group.Id)) continue

      const mergedChildren = mergedChildrenForImportGuard(prefetch, group)
      if (!onlyOnlineFutureSessionsRemain(mergedChildren)) continue

      const handle = handleForGroup(group)
      if (onlyEmptyPdp) {
        const built = await buildStoreEventDetail(container, handle)
        const variants = (built?.variants ?? []) as unknown[]
        if (variants.length > 0) continue
      }

      candidates.push(group)
      if (limit && candidates.length >= limit) break
    }

    logger.info(
      `[reimport-only-online] matched ${candidates.length} group(s)` +
        (dryRun ? " (dry-run)" : "") +
        (onlyEmptyPdp ? " (only-empty-pdp)" : "")
    )

    if (dryRun) {
      for (const group of candidates) {
        logger.info(
          `[reimport-only-online] would reimport ${group.Name?.trim() || group.Id} (${handleForGroup(group)})`
        )
      }
      return
    }

    let imported = 0
    let failed = 0

    for (const group of candidates) {
      const salesforceId = group.Id!
      const handle = handleForGroup(group)
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
          skipSearch: true,
          skipSanitySync: true,
        })

        if (result.skipped) {
          logger.warn(
            `[reimport-only-online] skipped ${handle} (${result.skipReason ?? "unknown"})`
          )
          continue
        }

        const built = await rebuildEventDetail(container, handle, { revalidateStorefront: true })
        const variantCount = ((built?.variants ?? []) as unknown[]).length
        logger.info(`[reimport-only-online] ok ${handle} variants=${variantCount}`)
        imported += 1
      } catch (err) {
        failed += 1
        logger.error(
          `[reimport-only-online] failed ${handle}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    logger.info(`[reimport-only-online] done imported=${imported} failed=${failed}`)
  } finally {
    if (!dryRun) {
      if (previousSuppressPush === undefined) delete process.env.SALESFORCE_SUPPRESS_PUSH
      else process.env.SALESFORCE_SUPPRESS_PUSH = previousSuppressPush
      if (previousSuppressSanity === undefined) delete process.env.SALESFORCE_SUPPRESS_SANITY_SYNC
      else process.env.SALESFORCE_SUPPRESS_SANITY_SYNC = previousSuppressSanity
    }
  }
}
