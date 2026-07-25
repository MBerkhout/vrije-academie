import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  discountOrderItemFields,
  productOrderItemFields,
} from "../../../modules/salesforce-sync/mappings/order-item"
import {
  registrationToSalesforce,
  registrationExternalIdField,
  SF_REGISTRATION_OBJECT,
} from "../../../modules/salesforce-sync/mappings/registration"
import {
  ORDER_ITEM_EXTERNAL_ID_FIELD,
  SF_ORDER_ITEM_OBJECT,
  SALESFORCE_DISCOUNT_PRODUCT2_ID,
} from "../../../modules/salesforce-sync/utils/salesforce-config"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"
import { resolvePricebookEntryId } from "../../../modules/salesforce-sync/utils/resolve-pricebook-entry"
import {
  ensureSyncState,
  findOrderItemByOrderRegistration,
  findRegistrationByOrderAndVaProduct,
  findSalesforceIdByExternalId,
  resolveExistingSalesforceId,
  upsertSalesforceRecordById,
} from "../../../modules/salesforce-sync/utils/upsert-record"

import type { EnsureOrderCustomerOutput } from "./ensure-order-customer-salesforce-step"
import type { PushOrderHeaderOutput } from "./push-order-header-salesforce-step"
import type { PreparePushOrderOutput } from "./prepare-push-order-step"

export type PushOrderLinesInput = {
  prep: PreparePushOrderOutput
  customer: EnsureOrderCustomerOutput
  header: PushOrderHeaderOutput
}

export type PushOrderLinesOutput = {
  skipped: boolean
  registrationIds: Record<string, string>
  orderItemIds: Record<string, string>
}

export const pushOrderLinesSalesforceStep = createStep(
  { name: "push-order-lines-salesforce", maxRetries: 5, retryInterval: 30 },
  async (input: PushOrderLinesInput, { container }) => {
    if (
      input.prep.skipped ||
      !input.prep.payload ||
      input.header.skipped ||
      !input.header.salesforceOrderId
    ) {
      return new StepResponse<PushOrderLinesOutput>({
        skipped: true,
        registrationIds: {},
        orderItemIds: {},
      })
    }

    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >
    const payload = input.prep.payload
    const orderId = input.header.salesforceOrderId
    const accountId = input.customer.salesforceAccountId!
    const contactId = input.customer.salesforceContactId!

    const discountPbe = await resolvePricebookEntryId(
      sync,
      SALESFORCE_DISCOUNT_PRODUCT2_ID
    )

    const registrationIds: Record<string, string> = {}
    const orderItemIds: Record<string, string> = {}

    for (const seat of payload.eventSeats) {
      const productPbe = await resolvePricebookEntryId(sync, seat.product2Id)

      let regSfId = await resolveExistingSalesforceId(
        sync,
        "registration",
        seat.registrationExternalId,
        () =>
          findSalesforceIdByExternalId(
            sync,
            SF_REGISTRATION_OBJECT,
            registrationExternalIdField,
            seat.registrationExternalId
          ).then(
            (id) =>
              id ??
              findRegistrationByOrderAndVaProduct(sync, orderId, seat.vaProductId)
          )
      )

      const regFields = registrationToSalesforce({
        externalId: seat.registrationExternalId,
        orderId,
        accountId,
        contactId,
        vaProductId: seat.vaProductId,
        lineTotalCents: seat.lineTotalCents,
        orderTotalCents: payload.totalCents,
        productStartAt: seat.productStartAt,
        productEndAt: seat.productEndAt,
        productCity: seat.productCity,
        billingStreet: payload.billingAddress?.address_1 ?? null,
        billingCity: payload.billingAddress?.city ?? null,
        billingPostalCode: payload.billingAddress?.postal_code ?? null,
        billingCountry: payload.billingAddress?.country_code ?? null,
      })

      regSfId = await upsertSalesforceRecordById(
        sync,
        SF_REGISTRATION_OBJECT,
        regSfId,
        registrationExternalIdField,
        seat.registrationExternalId,
        regFields
      )
      registrationIds[seat.registrationExternalId] = regSfId
      await ensureSyncState(sync, "registration", seat.registrationExternalId, regSfId)

      let productItemId = await resolveExistingSalesforceId(
        sync,
        "order_item",
        seat.productLineExternalId,
        () =>
          findSalesforceIdByExternalId(
            sync,
            SF_ORDER_ITEM_OBJECT,
            ORDER_ITEM_EXTERNAL_ID_FIELD,
            seat.productLineExternalId
          ).then(
            (id) =>
              id ??
              findOrderItemByOrderRegistration(
                sync,
                orderId,
                regSfId,
                "product",
                seat.vaProductId
              )
          )
      )
      productItemId = await upsertSalesforceRecordById(
        sync,
        SF_ORDER_ITEM_OBJECT,
        productItemId,
        ORDER_ITEM_EXTERNAL_ID_FIELD,
        seat.productLineExternalId,
        productOrderItemFields({
          externalId: seat.productLineExternalId,
          orderId,
          pricebookEntryId: productPbe,
          product2Id: seat.product2Id,
          vaProductId: seat.vaProductId,
          unitPriceCents: seat.unitPriceCents,
          registrationId: regSfId,
          productLabel: seat.productLabel,
        })
      )
      orderItemIds[seat.productLineExternalId] = productItemId
      await ensureSyncState(sync, "order_item", seat.productLineExternalId, productItemId)

      if (seat.discountLineExternalId && seat.discountCents > 0) {
        let discountItemId = await resolveExistingSalesforceId(
          sync,
          "order_item",
          seat.discountLineExternalId,
          () =>
            findSalesforceIdByExternalId(
              sync,
              SF_ORDER_ITEM_OBJECT,
              ORDER_ITEM_EXTERNAL_ID_FIELD,
              seat.discountLineExternalId!
            ).then(
              (id) =>
                id ??
                findOrderItemByOrderRegistration(sync, orderId, regSfId, "discount")
            )
        )
        discountItemId = await upsertSalesforceRecordById(
          sync,
          SF_ORDER_ITEM_OBJECT,
          discountItemId,
          ORDER_ITEM_EXTERNAL_ID_FIELD,
          seat.discountLineExternalId,
          discountOrderItemFields({
            externalId: seat.discountLineExternalId,
            orderId,
            pricebookEntryId: discountPbe,
            product2Id: SALESFORCE_DISCOUNT_PRODUCT2_ID,
            discountCents: seat.discountCents,
            registrationId: regSfId,
            promotionCode: seat.promotionCode,
          })
        )
        orderItemIds[seat.discountLineExternalId] = discountItemId
        await ensureSyncState(sync, "order_item", seat.discountLineExternalId, discountItemId)
      }
    }

    return new StepResponse<PushOrderLinesOutput>({
      skipped: false,
      registrationIds,
      orderItemIds,
    })
  }
)
