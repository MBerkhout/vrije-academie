import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { markPushSuccessStep } from "./steps/mark-push-success-step"
import { preparePushVariantStep } from "./steps/prepare-push-variant-step"
import { syncSanityAfterSalesforceStep } from "./steps/sync-sanity-product-step"
import { upsertSalesforceStep } from "./steps/upsert-salesforce-step"

export const pushVariantToSalesforceWorkflowId = "push-variant-salesforce"

export const pushVariantToSalesforceWorkflow = createWorkflow(
  pushVariantToSalesforceWorkflowId,
  function (input: WorkflowData<{ variantId: string }>) {
    const prep = preparePushVariantStep({ variantId: input.variantId })

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
      transform({ prep }, ({ prep }) => ({
        skipped: prep.skipped,
        productId: prep.parentProductId,
      }))
    )

    return new WorkflowResponse(marked)
  }
)
