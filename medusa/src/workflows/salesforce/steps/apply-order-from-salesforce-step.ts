import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import { orderMapping } from "../../../modules/salesforce-sync/mappings/order"

export type ApplyOrderFromSfInput = {
  medusaId: string
  record: Record<string, unknown>
}

export const applyOrderFromSalesforceStep = createStep(
  { name: "apply-order-from-salesforce", maxRetries: 3, retryInterval: 30 },
  async (input: ApplyOrderFromSfInput, { container }) => {
    const update = orderMapping.fromSalesforce(
      input.record as Parameters<typeof orderMapping.fromSalesforce>[0]
    )
    const clean: Record<string, unknown> = {}
    if (update.email !== undefined) clean.email = update.email
    if (update.status !== undefined) clean.status = update.status

    if (Object.keys(clean).length === 0) {
      return new StepResponse<{ updated: boolean }>({ updated: false })
    }

    const orderModule = container.resolve(Modules.ORDER)
    await orderModule.updateOrders({ id: input.medusaId }, clean)
    return new StepResponse<{ updated: boolean }>({ updated: true })
  }
)
