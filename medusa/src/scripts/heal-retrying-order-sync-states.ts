import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { SF_ORDER_OBJECT } from "../modules/salesforce-sync/utils/salesforce-config"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

/**
 * Mark order sync rows as success when Salesforce Order is already Activated.
 * Dry run by default; pass --fix to update.
 */
export default async function healRetryingOrderSyncStates({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fix = process.argv.includes("--fix")
  const limit = Number(arg("--limit") ?? "500")

  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  if (!(await sync.isIntegrationReady())) {
    logger.error("[heal-retrying-orders] Salesforce not configured")
    return
  }

  const rows = await sync.listSalesforceSyncStates(
    { entity_type: "order", last_status: "retrying" },
    { take: limit }
  )

  let healed = 0
  let skipped = 0

  for (const row of rows) {
    const sfId = row.salesforce_id?.trim()
    if (!sfId) {
      skipped += 1
      continue
    }
    try {
      const sf = await sync.retrieve(SF_ORDER_OBJECT, sfId, ["Id", "Status"])
      if (String(sf.Status ?? "") !== "Activated") {
        skipped += 1
        continue
      }
      logger.info(`[heal-retrying-orders] ${row.medusa_id} → success (SF ${sfId})`)
      if (fix) {
        await sync.updateSalesforceSyncStates({
          id: row.id,
          last_status: "success",
          last_error: null,
          failure_count: 0,
          severity: null,
        })
      }
      healed += 1
    } catch (err) {
      logger.warn(
        `[heal-retrying-orders] skip ${row.medusa_id}: ${err instanceof Error ? err.message : String(err)}`
      )
      skipped += 1
    }
  }

  logger.info(
    `[heal-retrying-orders] scanned=${rows.length} would_heal=${healed} skipped=${skipped} fix=${fix}`
  )
}