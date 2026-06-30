import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { SF_ORDER_OBJECT } from "../../../modules/salesforce-sync/utils/salesforce-config"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

import type { PushOrderHeaderOutput } from "./push-order-header-salesforce-step"
import type { PreparePushOrderOutput } from "./prepare-push-order-step"

export type ActivateOrderInput = {
  prep: PreparePushOrderOutput
  header: PushOrderHeaderOutput
}

export type ActivateOrderOutput = {
  skipped: boolean
  salesforceOrderId: string | null
}

export const activateOrderSalesforceStep = createStep(
  { name: "activate-order-salesforce", maxRetries: 5, retryInterval: 30 },
  async (input: ActivateOrderInput, { container }) => {
    if (
      input.prep.skipped ||
      input.header.skipped ||
      !input.header.salesforceOrderId
    ) {
      return new StepResponse<ActivateOrderOutput>({
        skipped: true,
        salesforceOrderId: null,
      })
    }

    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >
    const sfOrderId = input.header.salesforceOrderId

    await sync.updateRecord(SF_ORDER_OBJECT, sfOrderId, {
      Status: "Activated",
    })

    return new StepResponse<ActivateOrderOutput>({
      skipped: false,
      salesforceOrderId: sfOrderId,
    })
  }
)
