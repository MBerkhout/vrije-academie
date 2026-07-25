import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { markPushSuccessStep } from "./steps/mark-push-success-step"
import { preparePushProductStep } from "./steps/prepare-push-product-step"
import { syncSanityAfterSalesforceStep } from "./steps/sync-sanity-product-step"
import { upsertSalesforceStep } from "./steps/upsert-salesforce-step"

export const pushProductToSalesforceWorkflowId = "push-product-salesforce"

export const pushProductToSalesforceWorkflow = createWorkflow(
  pushProductToSalesforceWorkflowId,
  function (input: WorkflowData<{ productId: string }>) {
    const prep = preparePushProductStep({ productId: input.productId })

    const upserted = upsertSalesforceStep(
      transform({ prep }, ({ prep }) => ({
        skipped: prep.skipped,
        salesforceObject: prep.salesforceObject,
        externalIdField: prep.externalIdField,
        externalId: prep.externalId,
        existingSalesforceId: prep.existingSalesforceId,
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

    syncSanityAfterSalesforceStep(
      transform({ input, prep }, ({ input, prep }) => ({
        skipped: prep.skipped,
        productId: input.productId,
      }))
    )

    return new WorkflowResponse(marked)
  }
)
