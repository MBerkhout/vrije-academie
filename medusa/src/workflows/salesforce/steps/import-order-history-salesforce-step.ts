import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { importCustomerOrderHistory } from "../../../modules/salesforce-sync/utils/import-salesforce-order-history"

export type ImportOrderHistoryStepInput = {
  customerId: string
  force?: boolean
}

export const importOrderHistorySalesforceStep = createStep(
  { name: "import-order-history-salesforce", maxRetries: 2, retryInterval: 60 },
  async (input: ImportOrderHistoryStepInput, { container }) => {
    const result = await importCustomerOrderHistory(container, input.customerId, {
      force: input.force === true,
    })
    return new StepResponse(result ?? { imported: 0, skipped: 0, total: 0, status: "done" })
  }
)
