import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { normalizeGiftCardCode } from "./gift-card-code"
import { GIFT_CARD_MODULE } from "../modules/gift-card"
import GiftCardModuleService from "../modules/gift-card/service"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import {
  fetchSalesforceVoucherByCode,
  isSalesforceGiftcardVoucher,
  mapSalesforceVoucherStatus,
  salesforceVoucherBalanceCents,
  salesforceVoucherExpiresAt,
  salesforceVoucherInitialCents,
} from "../modules/salesforce-sync/utils/fetch-salesforce-voucher"
import { customerFacingCodeFromVoucher } from "../modules/salesforce-sync/utils/salesforce-voucher-code"
import { refreshGiftCardBalanceFromSalesforce } from "./refresh-gift-card-from-salesforce"

type GiftCardRow = Awaited<ReturnType<GiftCardModuleService["listGiftCards"]>>[number]

/**
 * When Medusa has no gift_card for a code, look up Voucher__c in Salesforce and import (or refresh) a row.
 */
export async function exploreGiftCardFromSalesforce(
  container: MedusaContainer,
  rawCode: string
): Promise<GiftCardRow | null> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  const gift = container.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>

  if (!(await sync.isIntegrationReady())) {
    return null
  }

  const normalized = normalizeGiftCardCode(rawCode)
  const voucher = await fetchSalesforceVoucherByCode(sync, normalized)
  if (!voucher?.Id) {
    return null
  }

  if (!isSalesforceGiftcardVoucher(voucher)) {
    logger.info(`[gift-card] Salesforce voucher ${voucher.Id} is not a giftcard type — skip import`)
    return null
  }

  const customerCode =
    customerFacingCodeFromVoucher({
      Code__c: voucher.Code__c,
      Name: voucher.Name,
    }) ?? normalized

  const balanceCents = salesforceVoucherBalanceCents(voucher)
  const initialCents = salesforceVoucherInitialCents(voucher)
  const status = mapSalesforceVoucherStatus(voucher)
  const expiresAt = salesforceVoucherExpiresAt(voucher)

  const recipientName =
    (typeof voucher.Beneficiary_Name__c === "string" && voucher.Beneficiary_Name__c.trim()) ||
    "Ontvanger"
  const recipientEmail =
    (typeof voucher.Beneficiary_Email__c === "string" && voucher.Beneficiary_Email__c.trim()) ||
    "unknown@vrijeacademie.nl"

  let giftCardId: string | null = null
  const linked = await sync.getStateBySalesforceId("voucher", voucher.Id)
  if (linked?.medusa_id) {
    giftCardId = linked.medusa_id
  }

  let card: GiftCardRow | undefined
  if (giftCardId) {
    card = (await gift.listGiftCards({ id: giftCardId }))[0]
  }
  if (!card) {
    card = (await gift.getByCode(customerCode)) ?? undefined
  }

  if (card) {
    const collision = await gift.listGiftCards({ code: customerCode })
    if (collision.some((row) => row.id !== card!.id)) {
      logger.error(`[gift-card] Cannot sync Salesforce code ${customerCode} — already used locally`)
      return null
    }
    await gift.updateGiftCards({
      id: card.id,
      code: customerCode,
      initial_value: Math.max(Number(card.initial_value), initialCents),
      expires_at: expiresAt,
      recipient_name: card.recipient_name || recipientName,
      recipient_email: card.recipient_email || recipientEmail,
    })
    await upsertVoucherSyncState(sync, card.id, voucher.Id)
    const linked = (await gift.listGiftCards({ id: card.id }))[0]
    if (!linked) return null
    return refreshGiftCardBalanceFromSalesforce(container, linked, customerCode)
  }

  const [created] = await gift.createGiftCards([
    {
      code: customerCode,
      initial_value: initialCents,
      balance: balanceCents,
      currency_code: "eur",
      status,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      sender_name: null,
      message: null,
      purchased_by_order_id: null,
      source_line_item_id: null,
      expires_at: expiresAt,
    },
  ])

  await gift.createGiftCardTransactions({
    gift_card_id: created.id,
    cart_id: null,
    type: "issuance",
    amount: initialCents,
    order_id: null,
    note: "imported_from_salesforce_voucher",
  })

  await upsertVoucherSyncState(sync, created.id, voucher.Id)
  logger.info(`[gift-card] Imported Salesforce voucher ${voucher.Id} as ${customerCode}`)
  return created
}

async function upsertVoucherSyncState(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  medusaId: string,
  salesforceId: string
) {
  const byMedusa = await sync.getStateByMedusaId("voucher", medusaId)
  if (byMedusa) {
    await sync.updateSalesforceSyncStates({
      id: byMedusa.id,
      salesforce_id: salesforceId,
      last_status: "success",
    })
    return
  }
  const bySf = await sync.getStateBySalesforceId("voucher", salesforceId)
  if (bySf) {
    await sync.updateSalesforceSyncStates({
      id: bySf.id,
      medusa_id: medusaId,
      salesforce_id: salesforceId,
      last_status: "success",
    })
    return
  }
  await sync.createSalesforceSyncStates([
    {
      entity_type: "voucher",
      medusa_id: medusaId,
      salesforce_id: salesforceId,
      last_status: "success",
    },
  ])
}
