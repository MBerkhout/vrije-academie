import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  giftCardPurchaseOrderItemFields,
  voucherRedemptionOrderItemFields,
} from "../../../modules/salesforce-sync/mappings/order-item"
import { voucherPurchaseToSalesforce } from "../../../modules/salesforce-sync/mappings/registration"
import {
  ORDER_ITEM_EXTERNAL_ID_FIELD,
  SF_ORDER_ITEM_OBJECT,
  SF_VOUCHER_OBJECT,
  VOUCHER_GIFT_CARD_EXTERNAL_ID_FIELD,
} from "../../../modules/salesforce-sync/utils/salesforce-config"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"
import { resolvePricebookEntryId } from "../../../modules/salesforce-sync/utils/resolve-pricebook-entry"
import {
  findSalesforceIdByExternalId,
  findVoucherIdByCode,
  resolveGiftCardProduct2Id,
  resolveVoucherProduct2Id,
  upsertSalesforceRecordById,
} from "../../../modules/salesforce-sync/utils/upsert-record"

import type { PushOrderHeaderOutput } from "./push-order-header-salesforce-step"
import type { PreparePushOrderOutput } from "./prepare-push-order-step"

export type PushOrderVouchersInput = {
  prep: PreparePushOrderOutput
  header: PushOrderHeaderOutput
}

export type PushOrderVouchersOutput = {
  skipped: boolean
  voucherIds: Record<string, string>
  orderItemIds: Record<string, string>
}

export const pushOrderVouchersSalesforceStep = createStep(
  { name: "push-order-vouchers-salesforce", maxRetries: 5, retryInterval: 30 },
  async (input: PushOrderVouchersInput, { container }) => {
    if (
      input.prep.skipped ||
      !input.prep.payload ||
      input.header.skipped ||
      !input.header.salesforceOrderId
    ) {
      return new StepResponse<PushOrderVouchersOutput>({
        skipped: true,
        voucherIds: {},
        orderItemIds: {},
      })
    }

    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >
    const payload = input.prep.payload
    const orderId = input.header.salesforceOrderId
    const voucherIds: Record<string, string> = {}
    const orderItemIds: Record<string, string> = {}

    const giftCardProduct2Id = await resolveGiftCardProduct2Id(sync)
    const giftCardPbe = await resolvePricebookEntryId(sync, giftCardProduct2Id)
    const voucherProduct2Id = await resolveVoucherProduct2Id(sync)
    const voucherPbe = await resolvePricebookEntryId(sync, voucherProduct2Id)

    for (const purchase of payload.giftCardPurchases) {
      let itemId = await findSalesforceIdByExternalId(
        sync,
        SF_ORDER_ITEM_OBJECT,
        ORDER_ITEM_EXTERNAL_ID_FIELD,
        purchase.externalId
      )
      itemId = await upsertSalesforceRecordById(
        sync,
        SF_ORDER_ITEM_OBJECT,
        itemId,
        ORDER_ITEM_EXTERNAL_ID_FIELD,
        purchase.externalId,
        giftCardPurchaseOrderItemFields({
          externalId: purchase.externalId,
          orderId,
          pricebookEntryId: giftCardPbe,
          product2Id: giftCardProduct2Id,
          amountCents: purchase.amountCents,
          recipientName: purchase.recipientName,
          recipientEmail: purchase.recipientEmail,
        })
      )
      orderItemIds[purchase.externalId] = itemId

      if (purchase.giftCardId && purchase.giftCardCode) {
        let voucherId =
          (await sync.getStateByMedusaId("voucher", purchase.giftCardId))?.salesforce_id ??
          (await findSalesforceIdByExternalId(
            sync,
            SF_VOUCHER_OBJECT,
            VOUCHER_GIFT_CARD_EXTERNAL_ID_FIELD,
            purchase.giftCardId
          ))

        voucherId = await upsertSalesforceRecordById(
          sync,
          SF_VOUCHER_OBJECT,
          voucherId,
          VOUCHER_GIFT_CARD_EXTERNAL_ID_FIELD,
          purchase.giftCardId,
          voucherPurchaseToSalesforce({
            giftCardId: purchase.giftCardId,
            orderId,
            amountCents: purchase.amountCents,
            recipientName: purchase.recipientName,
            recipientEmail: purchase.recipientEmail,
            code: purchase.giftCardCode,
          })
        )
        voucherIds[purchase.giftCardId] = voucherId

        const existing = await sync.getStateByMedusaId("voucher", purchase.giftCardId)
        if (!existing) {
          await sync.createSalesforceSyncStates([
            {
              entity_type: "voucher",
              medusa_id: purchase.giftCardId,
              salesforce_id: voucherId,
              last_status: "success",
            },
          ])
        } else {
          await sync.updateSalesforceSyncStates({
            id: existing.id,
            salesforce_id: voucherId,
            last_status: "success",
          })
        }
      }
    }

    for (const redemption of payload.giftCardRedemptions) {
      let voucherId =
        redemption.voucherSalesforceId ??
        (await sync.getStateByMedusaId("voucher", redemption.giftCardId))?.salesforce_id ??
        (await findVoucherIdByCode(sync, redemption.giftCardCode))

      if (!voucherId) {
        throw new Error(
          `Gift card ${redemption.giftCardCode} has no Voucher__c in Salesforce — push purchase order first or create voucher manually`
        )
      }

      let itemId = await findSalesforceIdByExternalId(
        sync,
        SF_ORDER_ITEM_OBJECT,
        ORDER_ITEM_EXTERNAL_ID_FIELD,
        redemption.externalId
      )
      itemId = await upsertSalesforceRecordById(
        sync,
        SF_ORDER_ITEM_OBJECT,
        itemId,
        ORDER_ITEM_EXTERNAL_ID_FIELD,
        redemption.externalId,
        voucherRedemptionOrderItemFields({
          externalId: redemption.externalId,
          orderId,
          pricebookEntryId: voucherPbe,
          product2Id: voucherProduct2Id,
          amountCents: redemption.amountCents,
          voucherId,
          giftCardCode: redemption.giftCardCode.replace(/^GIFT-/i, ""),
        })
      )
      orderItemIds[redemption.externalId] = itemId
    }

    return new StepResponse<PushOrderVouchersOutput>({
      skipped: false,
      voucherIds,
      orderItemIds,
    })
  }
)
