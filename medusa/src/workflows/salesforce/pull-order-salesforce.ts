import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { markPullSuccessStep } from "./steps/mark-pull-success-step"
import { applyOrderFromSalesforceStep } from "./steps/apply-order-from-salesforce-step"
import { fetchSalesforceRecordStep } from "./steps/fetch-salesforce-record-step"
import { orderMapping } from "../../modules/salesforce-sync/mappings/order"
import { salesforceObjectForEntity } from "../../modules/salesforce-sync/mappings/index"
import { setIncomingLockStep } from "./steps/set-incoming-lock-step"

export const pullOrderFromSalesforceWorkflowId = "pull-order-salesforce"

export const pullOrderFromSalesforceWorkflow = createWorkflow(
  pullOrderFromSalesforceWorkflowId,
  function (input: WorkflowData<{ medusaId: string; salesforceId: string }>) {
    setIncomingLockStep({
      entityType: "order",
      medusaId: input.medusaId,
    })

    const record = fetchSalesforceRecordStep(
      transform({ input }, ({ input }) => ({
        salesforceObject: salesforceObjectForEntity("order"),
        salesforceId: input.salesforceId,
        fields: orderMapping.salesforceFieldsForPull,
      }))
    )

    applyOrderFromSalesforceStep(
      transform({ input, record }, ({ input, record }) => ({
        medusaId: input.medusaId,
        record,
      }))
    )

    const done = markPullSuccessStep(
      transform({ input }, ({ input }) => ({
        entityType: "order",
        medusaId: input.medusaId,
        salesforceId: input.salesforceId,
      }))
    )

    return new WorkflowResponse(done)
  }
)
