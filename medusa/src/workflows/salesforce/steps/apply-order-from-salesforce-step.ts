import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import { orderMapping } from "../../../modules/salesforce-sync/mappings/order"
import {
  ORDER_HIDDEN_FROM_ACCOUNT,
  isImportedSalesforceOrder,
} from "../../../modules/salesforce-sync/utils/order-import-metadata"

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
    const existing = await orderModule.retrieveOrder(input.medusaId, { select: ["id", "metadata"] })
    const metadata = (existing.metadata ?? {}) as Record<string, unknown>

    const sfStatus = String((input.record as { Status?: string }).Status ?? "").trim()
    if (isImportedSalesforceOrder(metadata) && sfStatus && sfStatus !== "Activated") {
      await orderModule.updateOrders(input.medusaId, {
        metadata: {
          ...metadata,
          [ORDER_HIDDEN_FROM_ACCOUNT]: true,
          sf_cancelled_in_salesforce: true,
        },
      })
      return new StepResponse<{ updated: boolean }>({ updated: true })
    }

    await orderModule.updateOrders({ id: input.medusaId }, clean)
    return new StepResponse<{ updated: boolean }>({ updated: true })
  }
)
