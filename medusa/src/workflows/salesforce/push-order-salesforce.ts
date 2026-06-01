import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { markPushSuccessStep } from "./steps/mark-push-success-step"
import { preparePushOrderStep } from "./steps/prepare-push-order-step"
import { upsertSalesforceStep } from "./steps/upsert-salesforce-step"

export const pushOrderToSalesforceWorkflowId = "push-order-salesforce"

export const pushOrderToSalesforceWorkflow = createWorkflow(
  pushOrderToSalesforceWorkflowId,
  function (input: WorkflowData<{ orderId: string }>) {
    const prep = preparePushOrderStep({ orderId: input.orderId })

    const upserted = upsertSalesforceStep(
      transform({ prep }, ({ prep }) => ({
        skipped: prep.skipped,
        salesforceObject: prep.salesforceObject,
        externalIdField: prep.externalIdField,
        externalId: prep.externalId,
        fields: prep.fields,
      }))
    )

    const marked = markPushSuccessStep(
      transform({ prep, upserted }, ({ prep, upserted }) => ({
        skipped: prep.skipped,
        entityType: prep.entityType,
        medusaId: prep.medusaId,
        salesforceId: upserted.salesforceId,
      }))
    )

    return new WorkflowResponse(marked)
  }
)
