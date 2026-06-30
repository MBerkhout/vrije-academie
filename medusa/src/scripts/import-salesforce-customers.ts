/**
 * Bulk-import Salesforce Person Account contacts into Medusa (no auth credentials).
 *
 *   npm run salesforce:import-customers
 *   npx medusa exec ./src/scripts/import-salesforce-customers.ts -- --dry-run --limit=5
 *   npx medusa exec ./src/scripts/import-salesforce-customers.ts -- --all
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { sfRequest } from "../modules/salesforce-sync/client/rest"
import { SF_CONTACT_OBJECT } from "../modules/salesforce-sync/mappings/customer"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { pullCustomerFromSalesforceWorkflowId } from "../workflows/salesforce/pull-customer-salesforce"
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

export default async function importSalesforceCustomers({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  if (!(await sync.isIntegrationReady())) {
    logger.error(
      "[import-salesforce-customers] Salesforce not configured. See docs/SALESFORCE_SYNC.md."
    )
    return
  }

  const dryRun = process.argv.includes("--dry-run")
  const importAll = process.argv.includes("--all")
  const limit = Math.min(5000, Math.max(0, Number(arg("--limit")) || 0))
  const logTag = "import-salesforce-customers"

  const activeFilter = importAll ? "" : " AND Active__c = true"
  const soql =
    `SELECT Id, Email, FirstName, LastName FROM ${SF_CONTACT_OBJECT} ` +
    `WHERE IsPersonAccount = true AND Email != null${activeFilter} ` +
    `ORDER BY LastModifiedDate DESC`

  logger.info(
    `[${logTag}] Querying contacts…` +
      (importAll ? " (all with email)" : " (Active__c = true + email)") +
      (dryRun ? " (dry-run)" : "") +
      (limit ? ` (limit=${limit})` : "")
  )

  const contacts = await queryAll<{ Id: string; Email?: string; FirstName?: string; LastName?: string }>(
    soql
  )
  const slice = limit > 0 ? contacts.slice(0, limit) : contacts
  logger.info(`[${logTag}] Found ${contacts.length} contact(s), processing ${slice.length}`)

  if (dryRun) {
    for (const row of slice) {
      logger.info(
        `[${logTag}] would import ${row.Id} ${row.Email ?? ""} ${row.FirstName ?? ""} ${row.LastName ?? ""}`.trim()
      )
    }
    return
  }

  let imported = 0
  let skipped = 0
  let failed = 0

  for (const row of slice) {
    const salesforceId = row.Id?.trim()
    if (!salesforceId) continue

    const existing = await sync.getStateBySalesforceId("customer", salesforceId)
    if (existing?.medusa_id) {
      skipped++
      logger.info(`[${logTag}] skip ${salesforceId} — already linked to ${existing.medusa_id}`)
      continue
    }

    try {
      const ret = await runSalesforceWorkflow(
        container,
        pullCustomerFromSalesforceWorkflowId,
        { salesforceId },
        { eventGroupId: salesforceId, entityType: "customer", medusaId: salesforceId }
      )
      const failedRun =
        ret.hasFailed === true ||
        !!ret.thrownError ||
        (Array.isArray(ret.errors) && ret.errors.length > 0)
      if (failedRun) {
        failed++
        logger.warn(`[${logTag}] failed import ${salesforceId}`)
        continue
      }
      imported++
      const result = ret.result as { medusaId?: string; created?: boolean } | undefined
      logger.info(
        `[${logTag}] imported ${salesforceId} → ${result?.medusaId ?? "?"} (created=${result?.created === true})`
      )
    } catch (err) {
      failed++
      logger.warn(`[${logTag}] error importing ${salesforceId}: ${(err as Error).message}`)
    }
  }

  logger.info(
    `[${logTag}] done imported=${imported} skipped=${skipped} failed=${failed} total=${slice.length}`
  )
}
