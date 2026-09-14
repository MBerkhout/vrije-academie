/**
 * Create Medusa_* Salesforce custom fields, Open in Medusa formula links, and FLS permission set.
 *
 *   npm run salesforce:create-fields -- --admin-url=https://medusa.example.com --dry-run
 *   npm run salesforce:create-fields -- --admin-url=https://medusa.example.com
 *
 * Re-run with a new --admin-url to update Custom Label Medusa_Admin_Base_Url (formulas keep working).
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { ensureMedusaCustomFields } from "../modules/salesforce-sync/utils/ensure-medusa-custom-fields"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function createSalesforceMedusaFields({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  if (!(await sync.isIntegrationReady())) {
    logger.error(
      "[salesforce-fields] Salesforce not configured. Connect in Admin or set JWT/refresh credentials. See docs/SALESFORCE_SYNC.md."
    )
    return
  }

  const adminUrl =
    arg("--admin-url")?.trim() ||
    process.env.SALESFORCE_MEDUSA_ADMIN_URL?.trim() ||
    ""

  if (!adminUrl) {
    logger.error(
      "[salesforce-fields] Pass --admin-url=https://your-medusa-host (Medusa Admin origin, no path) or set SALESFORCE_MEDUSA_ADMIN_URL."
    )
    return
  }

  const report = await ensureMedusaCustomFields({
    adminUrl,
    dryRun: process.argv.includes("--dry-run"),
    skipPermissionSet: process.argv.includes("--skip-permission-set"),
    logger,
  })

  logger.info(`[salesforce-fields] created: ${report.created.join(", ") || "(none)"}`)
  logger.info(`[salesforce-fields] updated: ${report.updated.join(", ") || "(none)"}`)
  logger.info(`[salesforce-fields] existed: ${report.existed.join(", ") || "(none)"}`)
  if (report.failed.length) {
    for (const row of report.failed) {
      logger.error(`[salesforce-fields] failed ${row.name}: ${row.error}`)
    }
    return
  }

  logger.info(
    "[salesforce-fields] Done. Set SALESFORCE_MEDUSA_CUSTOM_FIELDS=true and restart Medusa. Add Open in Medusa to the relevant page layouts / Lightning record pages. Assign permission set Medusa_Sync to other users who need the fields."
  )
}
