import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { markPushSuccessStep } from "./steps/mark-push-success-step"
import { preparePushCustomerStep } from "./steps/prepare-push-customer-step"
import { pushCustomerToSalesforceStep } from "./steps/push-customer-to-salesforce-step"

export const pushCustomerToSalesforceWorkflowId = "push-customer-salesforce"

export type PushCustomerToSalesforceWorkflowInput = {
  customerId: string
  isCreate?: boolean
}

export const pushCustomerToSalesforceWorkflow = createWorkflow(
  pushCustomerToSalesforceWorkflowId,
  function (input: WorkflowData<PushCustomerToSalesforceWorkflowInput>) {
    const prep = preparePushCustomerStep(
      transform({ input }, ({ input }) => ({
        customerId: input.customerId,
        isCreate: input.isCreate,
      }))
    )

    const pushed = pushCustomerToSalesforceStep(prep)

    const marked = markPushSuccessStep(
      transform({ prep, pushed }, ({ prep, pushed }) => ({
        skipped: prep.skipped,
        entityType: prep.entityType,
        medusaId: prep.medusaId,
        salesforceId: pushed.salesforceContactId,
        salesforceAccountId: pushed.salesforceAccountId,
        payloadFingerprint: prep.payloadFingerprint,
      }))
    )

    return new WorkflowResponse(marked)
  }
)
