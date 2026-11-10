import {
  createWorkflow,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { importOrderHistorySalesforceStep } from "./steps/import-order-history-salesforce-step"

export const importOrderHistorySalesforceWorkflowId = "import-order-history-salesforce"

export type ImportOrderHistorySalesforceInput = {
  customerId: string
  force?: boolean
}

export const importOrderHistorySalesforceWorkflow = createWorkflow(
  importOrderHistorySalesforceWorkflowId,
  function (input: WorkflowData<ImportOrderHistorySalesforceInput>) {
    const result = importOrderHistorySalesforceStep({
      customerId: input.customerId,
      force: input.force,
    })
    return new WorkflowResponse(result)
  }
)
