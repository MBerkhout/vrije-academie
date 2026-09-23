/**
 * Import or refresh one cadeaubon from Salesforce Voucher__c into Medusa.
 *
 *   npm run salesforce:import-voucher -- --code=GTC-202609-172150
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { exploreGiftCardFromSalesforce } from "../lib/explore-gift-card-from-salesforce"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function importSalesforceVoucher({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const code = arg("--code")?.trim()
  if (!code) {
    logger.info("[salesforce:import-voucher] Usage: --code=GTC-...")
    return
  }

  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  if (!(await sync.isIntegrationReady())) {
    logger.error("[salesforce:import-voucher] Salesforce not configured")
    return
  }

  const card = await exploreGiftCardFromSalesforce(container, code)
  if (!card) {
    logger.error(`[salesforce:import-voucher] No giftcard voucher found for ${code}`)
    return
  }

  logger.info(
    `[salesforce:import-voucher] OK id=${card.id} code=${card.code} balance=${card.balance} status=${card.status}`
  )
}
