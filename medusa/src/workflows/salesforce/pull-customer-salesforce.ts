import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { markPullSuccessStep } from "./steps/mark-pull-success-step"
import { applyCustomerFromSalesforceStep } from "./steps/apply-customer-from-salesforce-step"
import { fetchSalesforceRecordStep } from "./steps/fetch-salesforce-record-step"
import { customerMapping } from "../../modules/salesforce-sync/mappings/customer"
import { salesforceObjectForEntity } from "../../modules/salesforce-sync/mappings/index"

export const pullCustomerFromSalesforceWorkflowId = "pull-customer-salesforce"

export type PullCustomerFromSalesforceInput = {
  salesforceId: string
  /** When omitted, import-create mode (bulk import / webhook). */
  medusaId?: string
}

export const pullCustomerFromSalesforceWorkflow = createWorkflow(
  pullCustomerFromSalesforceWorkflowId,
  function (input: WorkflowData<PullCustomerFromSalesforceInput>) {
    const record = fetchSalesforceRecordStep(
      transform({ input }, ({ input }) => ({
        salesforceObject: salesforceObjectForEntity("customer"),
        salesforceId: input.salesforceId,
        fields: customerMapping.salesforceFieldsForPull,
      }))
    )

    const applied = applyCustomerFromSalesforceStep(
      transform({ input, record }, ({ input, record }) => ({
        medusaId: input.medusaId ?? null,
        salesforceId: input.salesforceId,
        record,
      }))
    )

    const done = markPullSuccessStep(
      transform({ input, applied }, ({ input, applied }) => ({
        entityType: "customer",
        medusaId: applied.medusaId,
        salesforceId: input.salesforceId,
        salesforceAccountId: applied.salesforceAccountId,
      }))
    )

    return new WorkflowResponse(
      transform({ applied, done }, ({ applied, done }) => ({
        ...done,
        medusaId: applied.medusaId,
        salesforceAccountId: applied.salesforceAccountId,
        created: applied.created,
        updated: applied.updated,
      }))
    )
  }
)
