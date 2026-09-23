import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { reconcileGiftCardBalanceWithSalesforce } from "./reconcile-gift-card-balance"
import { GIFT_CARD_MODULE } from "../modules/gift-card"
import GiftCardModuleService from "../modules/gift-card/service"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import {
  fetchSalesforceVoucherByCode,
  type SalesforceVoucherRecord,
  isSalesforceGiftcardVoucher,
  mapSalesforceVoucherStatus,
  salesforceVoucherBalanceCents,
} from "../modules/salesforce-sync/utils/fetch-salesforce-voucher"
import { SF_VOUCHER_OBJECT } from "../modules/salesforce-sync/utils/salesforce-config"

type GiftCardRow = Awaited<ReturnType<GiftCardModuleService["listGiftCards"]>>[number]

function syncBalanceDisabled(): boolean {
  return process.env.SALESFORCE_VOUCHER_SYNC_BALANCE?.trim().toLowerCase() === "false"
}

async function fetchVoucherForGiftCard(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  card: GiftCardRow,
  lookupCode: string
): Promise<SalesforceVoucherRecord | null> {
  const link = await sync.getStateByMedusaId("voucher", card.id)
  if (link?.salesforce_id) {
    try {
      const row = await sync.retrieve(SF_VOUCHER_OBJECT, link.salesforce_id, [
        "Id",
        "Name",
        "Code__c",
        "Type__c",
        "Original_Amount__c",
        process.env.SALESFORCE_VOUCHER_REMAINING_FIELD?.trim() || "Remaining_Amount__c",
        process.env.SALESFORCE_VOUCHER_STATUS_FIELD?.trim() || "Status__c",
      ])
      return row as SalesforceVoucherRecord
    } catch {
      /* fall back to code lookup */
    }
  }
  return fetchSalesforceVoucherByCode(sync, lookupCode)
}

/**
 * Before redeeming, align Medusa balance with Salesforce when SF remaining is lower
 * (e.g. redeemed in another channel). Never increases balance from SF.
 */
export async function refreshGiftCardBalanceFromSalesforce(
  container: MedusaContainer,
  card: GiftCardRow,
  lookupCode?: string
): Promise<GiftCardRow> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  const gift = container.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>

  if (syncBalanceDisabled() || !(await sync.isIntegrationReady())) {
    return card
  }

  const code = lookupCode?.trim() || String(card.code ?? "").trim()
  if (!code) return card

  const voucher = await fetchVoucherForGiftCard(sync, card, gift.normalizeCode(code))
  if (!voucher?.Id || !isSalesforceGiftcardVoucher(voucher)) {
    return card
  }

  const sfBalanceCents = salesforceVoucherBalanceCents(voucher)
  const localBalance = Number(card.balance)
  const nextBalance = reconcileGiftCardBalanceWithSalesforce(localBalance, sfBalanceCents)
  const status = mapSalesforceVoucherStatus(voucher)
  const nextStatus = nextBalance <= 0 ? "depleted" : status

  if (nextBalance !== localBalance || (nextBalance <= 0 && card.status === "active")) {
    logger.info(
      `[gift-card] Salesforce balance sync ${card.code}: ${localBalance} → ${nextBalance} cents (voucher ${voucher.Id})`
    )
    await gift.updateGiftCards({
      id: card.id,
      balance: nextBalance,
      status: nextStatus,
    })
    return (await gift.listGiftCards({ id: card.id }))[0] ?? card
  }

  return card
}
