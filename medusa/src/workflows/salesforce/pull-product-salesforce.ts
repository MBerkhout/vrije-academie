import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { markPullSuccessStep } from "./steps/mark-pull-success-step"
import { applyProductFromSalesforceStep } from "./steps/apply-product-from-salesforce-step"
import { fetchSalesforceRecordStep } from "./steps/fetch-salesforce-record-step"
import { productMapping } from "../../modules/salesforce-sync/mappings/product"
import { salesforceObjectForEntity } from "../../modules/salesforce-sync/mappings/index"

export const pullProductFromSalesforceWorkflowId = "pull-product-salesforce"

export type PullProductFromSalesforceInput = {
  salesforceId: string
  /** When omitted, creates a new Medusa product (unless already linked to this SF id). */
  medusaId?: string
}

export const pullProductFromSalesforceWorkflow = createWorkflow(
  pullProductFromSalesforceWorkflowId,
  function (input: WorkflowData<PullProductFromSalesforceInput>) {
    const record = fetchSalesforceRecordStep(
      transform({ input }, ({ input }) => ({
        salesforceObject: salesforceObjectForEntity("product"),
        salesforceId: input.salesforceId,
        fields: productMapping.salesforceFieldsForPull,
      }))
    )

    const applied = applyProductFromSalesforceStep(
      transform({ input, record }, ({ input, record }) => ({
        medusaId: input.medusaId ?? null,
        salesforceId: input.salesforceId,
        record,
      }))
    )

    const done = markPullSuccessStep(
      transform({ input, applied }, ({ input, applied }) => ({
        entityType: "product",
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
