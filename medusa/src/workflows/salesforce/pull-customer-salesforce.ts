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
import { setIncomingLockStep } from "./steps/set-incoming-lock-step"

export const pullCustomerFromSalesforceWorkflowId = "pull-customer-salesforce"

export const pullCustomerFromSalesforceWorkflow = createWorkflow(
  pullCustomerFromSalesforceWorkflowId,
  function (input: WorkflowData<{ medusaId: string; salesforceId: string }>) {
    setIncomingLockStep({
      entityType: "customer",
      medusaId: input.medusaId,
    })

    const record = fetchSalesforceRecordStep(
      transform({ input }, ({ input }) => ({
        salesforceObject: salesforceObjectForEntity("customer"),
        salesforceId: input.salesforceId,
        fields: customerMapping.salesforceFieldsForPull,
      }))
    )

    applyCustomerFromSalesforceStep(
      transform({ input, record }, ({ input, record }) => ({
        medusaId: input.medusaId,
        record,
      }))
    )

    const done = markPullSuccessStep(
      transform({ input }, ({ input }) => ({
        entityType: "customer",
        medusaId: input.medusaId,
        salesforceId: input.salesforceId,
      }))
    )

    return new WorkflowResponse(done)
  }
)
