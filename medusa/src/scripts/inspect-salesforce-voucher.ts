/**
 * Debug Salesforce Voucher__c lookup for a cadeaubon code.
 *
 *   npm run salesforce:inspect-voucher -- --code=GTC-202609-172150
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { normalizeGiftCardCode } from "../lib/gift-card-code"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { SF_VOUCHER_OBJECT } from "../modules/salesforce-sync/utils/salesforce-config"
import {
  filterSObjectFieldsByPattern,
  loadSObjectFieldDescribe,
} from "../modules/salesforce-sync/utils/salesforce-describe-fields"
import {
  buildVoucherSoqlSelect,
  fetchSalesforceVoucherByCode,
  isSalesforceGiftcardVoucher,
  isSalesforceVoucherMarkedExpired,
  mapSalesforceVoucherStatus,
  salesforceVoucherBalanceCents,
  salesforceVoucherExpiresAt,
} from "../modules/salesforce-sync/utils/fetch-salesforce-voucher"
import { resolveVoucherCustomerCode } from "../modules/salesforce-sync/utils/salesforce-voucher-code"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function inspectSalesforceVoucher({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const raw = arg("--code")?.trim()
  if (!raw) {
    logger.info("[salesforce:inspect-voucher] Usage: --code=GTC-...")
    return
  }

  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  if (!(await sync.isIntegrationReady())) {
    logger.error("[salesforce:inspect-voucher] Salesforce not configured")
    return
  }

  const normalized = normalizeGiftCardCode(raw)
  const soqlSelect = await buildVoucherSoqlSelect(sync)
  const describe = await loadSObjectFieldDescribe(SF_VOUCHER_OBJECT)
  const voucherFieldHints = describe
    ? filterSObjectFieldsByPattern(
        describe,
        /expir|eind|valid|remaining|bedrag|amount|status|actief/i
      ).map((f) => ({ name: f.name, label: f.label, type: f.type }))
    : []

  const voucher = await fetchSalesforceVoucherByCode(sync, normalized)
  if (!voucher) {
    logger.error(`[salesforce:inspect-voucher] No Voucher__c for ${normalized}`)
    return
  }

  const customerCode = resolveVoucherCustomerCode(
    { Code__c: voucher.Code__c, Name: voucher.Name },
    normalized
  )

  logger.info(
    JSON.stringify(
      {
        input: raw,
        normalized,
        soqlSelect,
        voucherFieldHints,
        voucher,
        customerCode,
        balanceCents: salesforceVoucherBalanceCents(voucher),
        mappedStatus: mapSalesforceVoucherStatus(voucher),
        isExpiredFlag: isSalesforceVoucherMarkedExpired(voucher),
        expiresAt: salesforceVoucherExpiresAt(voucher),
        isGiftcard: isSalesforceGiftcardVoucher(voucher),
      },
      null,
      2
    )
  )
}
