/**
 * Import a Salesforce omboeking order into Medusa for mijn-account display.
 *
 *   npx medusa exec ./src/scripts/import-salesforce-rebooked-order.ts -- --salesforce-id=801...
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { importRebookedOrder } from "../modules/salesforce-sync/utils/import-rebooked-order"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function importSalesforceRebookedOrder({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const salesforceId = arg("--salesforce-id")?.trim()

  if (!salesforceId) {
    logger.info(
      "[import-rebooked-order] Usage: --salesforce-id=801... (Salesforce Order Id from omboeking)"
    )
    return
  }

  const result = await importRebookedOrder(container, salesforceId)
  if (!result) {
    logger.warn(
      `[import-rebooked-order] ${salesforceId} is not a linked omboeking we can import`
    )
    return
  }

  logger.info(
    `[import-rebooked-order] ${result.created ? "created" : "already linked"} medusa order ${result.medusaOrderId}` +
      (result.hiddenOriginalOrderId
        ? `; hid original ${result.hiddenOriginalOrderId}`
        : "")
  )
}
