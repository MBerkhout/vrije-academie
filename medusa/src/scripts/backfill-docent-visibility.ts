import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { pullDocentFromSalesforceWorkflow } from "../workflows/salesforce/pull-docent-salesforce"

/**
 * Re-pull every linked teacher Account so `Visible_on_website__c` → `docent.is_active`.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/backfill-docent-visibility.ts -- --dry-run
 *   npx medusa exec ./src/scripts/backfill-docent-visibility.ts
 *   npx medusa exec ./src/scripts/backfill-docent-visibility.ts -- --limit=50
 */
export default async function backfillDocentVisibility({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  const dryRun = process.argv.includes("--dry-run")
  const limitArg = process.argv.find((a) => a.startsWith("--limit="))
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "", 10) : undefined

  if (!(await sync.isIntegrationReady())) {
    logger.error("[backfill-docent-visibility] Salesforce not configured")
    return
  }

  const states = await sync.listSalesforceSyncStates({ entity_type: "docent" })
  const rows = states
    .filter((row) => row.salesforce_id?.trim())
    .slice(0, limit && limit > 0 ? limit : undefined)

  logger.info(
    `[backfill-docent-visibility] ${dryRun ? "DRY RUN — " : ""}${rows.length} docent(s) to pull`
  )

  let ok = 0
  let failed = 0
  for (const row of rows) {
    const salesforceId = row.salesforce_id!.trim()
    if (dryRun) {
      logger.info(`[backfill-docent-visibility] would pull Account ${salesforceId}`)
      ok += 1
      continue
    }
    try {
      await pullDocentFromSalesforceWorkflow(container).run({
        input: { salesforceId },
      })
      ok += 1
    } catch (err) {
      failed += 1
      logger.error(
        `[backfill-docent-visibility] pull failed for ${salesforceId}: ${(err as Error).message}`
      )
    }
  }

  logger.info(`[backfill-docent-visibility] done ok=${ok} failed=${failed}`)
  if (!dryRun && ok > 0) {
    logger.info("[backfill-docent-visibility] run `npm run cache:flush` to refresh PLP snapshots")
  }
}