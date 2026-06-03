/**
 * Bulk-import Salesforce product groups (vaProductgroup__c + children).
 *
 * Default: future / VAthuis / online-only (see shouldBulkImportProductgroup).
 * --all: every product group since the beginning (manual import, bypasses date guard).
 *
 *   npm run salesforce:import-future
 *   npm run salesforce:import-all
 *   npx medusa exec ./src/scripts/import-future-productgroups.ts -- --dry-run --limit=5
 *   npx medusa exec ./src/scripts/import-future-productgroups.ts -- --all --dry-run --limit=5
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { sfRequest } from "../modules/salesforce-sync/client/rest"
import type { SfCourseProductShape } from "../modules/salesforce-sync/mappings/course-product"
import {
  courseProductSalesforceFieldsForPull,
  SF_COURSE_PRODUCT_OBJECT,
} from "../modules/salesforce-sync/mappings/course-product"
import type { SfProductgroupShape } from "../modules/salesforce-sync/mappings/productgroup"
import { SF_PRODUCTGROUP_OBJECT } from "../modules/salesforce-sync/mappings/productgroup"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { shouldBulkImportProductgroup } from "../modules/salesforce-sync/utils/future-import-guard"
import { pullProductgroupFromSalesforceWorkflowId } from "../workflows/salesforce/pull-productgroup-salesforce"
import { runSalesforceWorkflow } from "../workflows/salesforce/report-failure"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

type SfQueryPage<T> = {
  records: T[]
  done: boolean
  nextRecordsUrl?: string
}

async function queryAll<T>(soql: string): Promise<T[]> {
  const records: T[] = []
  let path = `/query?q=${encodeURIComponent(soql)}`

  while (path) {
    const { data } = await sfRequest<SfQueryPage<T>>("GET", path)
    records.push(...(data.records ?? []))
    if (data.done || !data.nextRecordsUrl) break
    const match = data.nextRecordsUrl.match(/\/services\/data\/v[\d.]+\/(.+)$/)
    path = match ? `/${match[1]}` : ""
  }

  return records
}

export default async function importFutureProductgroups({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  if (!(await sync.isIntegrationReady())) {
    logger.error("[import-future-productgroups] Salesforce not configured. See docs/SALESFORCE_SYNC.md.")
    return
  }

  const dryRun = process.argv.includes("--dry-run")
  const importAll = process.argv.includes("--all")
  const limit = Math.min(5000, Math.max(0, Number(arg("--limit")) || 0))
  const logTag = importAll ? "import-all-productgroups" : "import-future-productgroups"

  logger.info(
    `[${logTag}] Listing ${SF_PRODUCTGROUP_OBJECT}…` +
      (importAll ? " (all groups)" : " (future / VAthuis / online-only)") +
      (dryRun ? " (dry-run)" : "") +
      (limit ? ` (limit=${limit})` : "")
  )

  const groups = await queryAll<SfProductgroupShape>(
    `SELECT Id, Name, Latest_Product_Start_Date__c FROM ${SF_PRODUCTGROUP_OBJECT} ORDER BY Name`
  )

  const childFields = courseProductSalesforceFieldsForPull.join(",")
  let imported = 0
  let skipped = 0
  let failed = 0

  for (const group of groups) {
    if (!group.Id) continue
    if (limit && imported + skipped + failed >= limit) break

    const childQuery = await sync.query<SfCourseProductShape>(
      `SELECT ${childFields} FROM ${SF_COURSE_PRODUCT_OBJECT} WHERE Productgroup__c = '${group.Id.replace(/'/g, "\\'")}'`
    )
    const children = childQuery.records

    if (!importAll && !shouldBulkImportProductgroup({ group, children })) {
      skipped++
      continue
    }

    const label = group.Name?.trim() || group.Id
    if (dryRun) {
      logger.info(`[${logTag}] would import ${label} (${group.Id})`)
      imported++
      continue
    }

    try {
      const ret = await runSalesforceWorkflow(
        container,
        pullProductgroupFromSalesforceWorkflowId,
        { salesforceId: group.Id, manual: true },
        { eventGroupId: group.Id, entityType: "productgroup", medusaId: group.Id }
      )
      const result = ret.result as { medusaId?: string; skipped?: boolean; skipReason?: string } | undefined
      if (result?.skipped) {
        logger.warn(`[${logTag}] skipped ${label} (${group.Id}): ${result.skipReason ?? "skipped"}`)
        skipped++
      } else {
        logger.info(`[${logTag}] imported ${label} (${group.Id}) → ${result?.medusaId ?? "?"}`)
        imported++
      }
    } catch (err) {
      failed++
      logger.error(
        `[${logTag}] failed ${label} (${group.Id}): ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  logger.info(
    `[${logTag}] Done. imported=${imported} skipped=${skipped} failed=${failed} (scanned ${groups.length} groups)`
  )
}
