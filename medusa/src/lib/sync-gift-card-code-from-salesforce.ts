import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { sendGiftCardPurchasedNotification } from "./gift-card-purchased-notification"
import { GIFT_CARD_MODULE } from "../modules/gift-card"
import GiftCardModuleService from "../modules/gift-card/service"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { resolveVoucherCustomerCode } from "../modules/salesforce-sync/utils/salesforce-voucher-code"
import { SF_VOUCHER_OBJECT } from "../modules/salesforce-sync/utils/salesforce-config"

const INTERNAL_GIFT_CODE = /^GIFT-[0-9A-F]{8}$/i

export type SyncGiftCardFromSalesforceInput = {
  giftCardId: string
  voucherSalesforceId: string
  medusaOrderId: string
}

/**
 * After Voucher__c upsert: copy Salesforce GTC code onto the Medusa gift card and email the recipient.
 */
export async function syncGiftCardCodeFromSalesforceVoucher(
  container: MedusaContainer,
  input: SyncGiftCardFromSalesforceInput
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  const gift = container.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>

  const voucher = await sync.retrieve(SF_VOUCHER_OBJECT, input.voucherSalesforceId, [
    "Id",
    "Name",
    "Code__c",
  ])
  const cardsForHint = await gift.listGiftCards({ id: input.giftCardId })
  const hintCode = cardsForHint[0]?.code ?? null
  const customerCode = resolveVoucherCustomerCode(
    {
      Code__c: voucher.Code__c as string | null | undefined,
      Name: voucher.Name as string | null | undefined,
    },
    hintCode ? gift.normalizeCode(hintCode) : null
  )

  if (!customerCode) {
    logger.warn(
      `[gift-card] Voucher ${input.voucherSalesforceId} has no redeem code (Code__c/Name) — skipping code sync and email`
    )
    return
  }

  const cards = await gift.listGiftCards({ id: input.giftCardId })
  const card = cards[0]
  if (!card) {
    logger.warn(`[gift-card] gift card ${input.giftCardId} not found for Salesforce voucher sync`)
    return
  }

  const previousCode = String(card.code ?? "").trim().toUpperCase()
  const normalizedCustomer = gift.normalizeCode(customerCode)

  if (previousCode !== normalizedCustomer) {
    const collision = await gift.listGiftCards({ code: normalizedCustomer })
    if (collision.some((row) => row.id !== input.giftCardId)) {
      logger.error(
        `[gift-card] Salesforce code ${normalizedCustomer} already used by another gift card`
      )
      return
    }
    await gift.updateGiftCards({ id: input.giftCardId, code: normalizedCustomer })
  }

  const sendCorrection =
    previousCode !== normalizedCustomer && INTERNAL_GIFT_CODE.test(previousCode)

  await sendGiftCardPurchasedNotification(container, {
    giftCardId: input.giftCardId,
    code: normalizedCustomer,
    amountCents: Number(card.initial_value),
    recipientName: card.recipient_name,
    recipientEmail: card.recipient_email,
    senderName: card.sender_name,
    message: card.message,
    orderId: input.medusaOrderId,
    idempotencyKey: sendCorrection
      ? `gift-card-${input.giftCardId}-sf-code`
      : `gift-card-${input.giftCardId}`,
  })
}
