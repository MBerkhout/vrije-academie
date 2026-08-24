import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { applyDocentFromSalesforceStep } from "./steps/apply-docent-from-salesforce-step"
import { markPullSuccessStep } from "./steps/mark-pull-success-step"

export const pullDocentFromSalesforceWorkflowId = "pull-docent-salesforce"

export type PullDocentFromSalesforceInput = {
  salesforceId: string
}

export const pullDocentFromSalesforceWorkflow = createWorkflow(
  pullDocentFromSalesforceWorkflowId,
  function (input: WorkflowData<PullDocentFromSalesforceInput>) {
    const applied = applyDocentFromSalesforceStep(input)

    const done = markPullSuccessStep(
      transform({ input, applied }, ({ input, applied }) => ({
        entityType: "docent",
        medusaId: applied.medusaId,
        salesforceId: input.salesforceId,
      }))
    )

    return new WorkflowResponse(
      transform({ applied, done }, ({ applied, done }) => ({
        ...done,
        medusaId: applied.medusaId,
        created: applied.created,
        updated: applied.updated,
      }))
    )
  }
)
