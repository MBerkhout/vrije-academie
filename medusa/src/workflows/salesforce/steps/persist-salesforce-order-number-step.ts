import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { resolveSalesforceOrderNumber } from "../../../lib/resolve-salesforce-order-number"

import type { ActivateOrderOutput } from "./activate-order-salesforce-step"
import type { PreparePushOrderOutput } from "./prepare-push-order-step"

export type PersistSalesforceOrderNumberInput = {
  prep: PreparePushOrderOutput
  activated: ActivateOrderOutput
}

export type PersistSalesforceOrderNumberOutput = {
  skipped: boolean
  salesforceOrderNumber: string | null
}

export const persistSalesforceOrderNumberStep = createStep(
  { name: "persist-salesforce-order-number", maxRetries: 3, retryInterval: 10 },
  async (input: PersistSalesforceOrderNumberInput, { container }) => {
    if (
      input.prep.skipped ||
      input.activated.skipped ||
      !input.activated.salesforceOrderId ||
      !input.prep.medusaId
    ) {
      return new StepResponse<PersistSalesforceOrderNumberOutput>({
        skipped: true,
        salesforceOrderNumber: null,
      })
    }

    const salesforceOrderNumber = await resolveSalesforceOrderNumber(container, {
      orderId: input.prep.medusaId,
      salesforceOrderId: input.activated.salesforceOrderId,
    })

    return new StepResponse<PersistSalesforceOrderNumberOutput>({
      skipped: false,
      salesforceOrderNumber,
    })
  }
)
