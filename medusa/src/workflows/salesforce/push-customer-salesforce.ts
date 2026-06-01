import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { markPushSuccessStep } from "./steps/mark-push-success-step"
import { preparePushCustomerStep } from "./steps/prepare-push-customer-step"
import { upsertSalesforceStep } from "./steps/upsert-salesforce-step"

export const pushCustomerToSalesforceWorkflowId = "push-customer-salesforce"

export const pushCustomerToSalesforceWorkflow = createWorkflow(
  pushCustomerToSalesforceWorkflowId,
  function (input: WorkflowData<{ customerId: string }>) {
    const prep = preparePushCustomerStep({ customerId: input.customerId })

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
