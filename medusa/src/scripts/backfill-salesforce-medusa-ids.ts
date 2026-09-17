/**
 * Write Medusa product/variant ids onto existing Salesforce product groups and sessions.
 *
 *   npm run salesforce:backfill-ids -- --dry-run
 *   npm run salesforce:backfill-ids
 *
 * Requires Medusa_* fields on vaProductgroup__c / vaProduct__c (re-run salesforce:create-fields).
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { backfillMedusaIdsToSalesforce } from "../modules/salesforce-sync/utils/backfill-medusa-ids"

export default async function backfillSalesforceMedusaIds({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  if (!(await sync.isIntegrationReady())) {
    logger.error("[salesforce-ids] Salesforce not configured.")
    return
  }

  const report = await backfillMedusaIdsToSalesforce(container, logger, {
    dryRun: process.argv.includes("--dry-run"),
  })
  logger.info(
    `[salesforce-ids] Done. groups=${report.groups} sessions=${report.variants} ok=${report.ok} failed=${report.failed}`
  )
}
