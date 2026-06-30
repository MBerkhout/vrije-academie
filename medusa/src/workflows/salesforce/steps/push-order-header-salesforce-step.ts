import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { ORDER_EXTERNAL_ID_FIELD, SF_ORDER_OBJECT } from "../../../modules/salesforce-sync/utils/salesforce-config"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"
import {
  findSalesforceIdByExternalId,
  upsertSalesforceRecordById,
} from "../../../modules/salesforce-sync/utils/upsert-record"

import type { PreparePushOrderOutput } from "./prepare-push-order-step"
import type { EnsureOrderCustomerOutput } from "./ensure-order-customer-salesforce-step"

export type PushOrderHeaderInput = {
  prep: PreparePushOrderOutput
  customer: EnsureOrderCustomerOutput
}

export type PushOrderHeaderOutput = {
  skipped: boolean
  salesforceOrderId: string | null
}

export const pushOrderHeaderSalesforceStep = createStep(
  { name: "push-order-header-salesforce", maxRetries: 5, retryInterval: 30 },
  async (input: PushOrderHeaderInput, { container }) => {
    if (input.prep.skipped || !input.prep.payload) {
      return new StepResponse<PushOrderHeaderOutput>({
        skipped: true,
        salesforceOrderId: null,
      })
    }

    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >
    const payload = input.prep.payload
    const fields: Record<string, unknown> = {
      ...input.prep.orderHeader,
      AccountId: input.customer.salesforceAccountId ?? undefined,
      BillToContactId: input.customer.salesforceContactId ?? undefined,
      ShipToContactId: input.customer.salesforceContactId ?? undefined,
    }

    let existingId =
      payload.existingSalesforceOrderId ??
      (await findSalesforceIdByExternalId(
        sync,
        SF_ORDER_OBJECT,
        ORDER_EXTERNAL_ID_FIELD,
        payload.orderId
      ))

    const salesforceOrderId = await upsertSalesforceRecordById(
      sync,
      SF_ORDER_OBJECT,
      existingId,
      ORDER_EXTERNAL_ID_FIELD,
      payload.orderId,
      fields
    )

    return new StepResponse<PushOrderHeaderOutput>({
      skipped: false,
      salesforceOrderId,
    })
  }
)
