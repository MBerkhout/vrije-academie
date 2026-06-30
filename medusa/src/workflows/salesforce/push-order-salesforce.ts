import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { activateOrderSalesforceStep } from "./steps/activate-order-salesforce-step"
import { ensureOrderCustomerSalesforceStep } from "./steps/ensure-order-customer-salesforce-step"
import { markPushSuccessStep } from "./steps/mark-push-success-step"
import { preparePushOrderStep } from "./steps/prepare-push-order-step"
import { pushOrderHeaderSalesforceStep } from "./steps/push-order-header-salesforce-step"
import { pushOrderLinesSalesforceStep } from "./steps/push-order-lines-salesforce-step"
import { pushOrderVouchersSalesforceStep } from "./steps/push-order-vouchers-salesforce-step"

export const pushOrderToSalesforceWorkflowId = "push-order-salesforce"

export const pushOrderToSalesforceWorkflow = createWorkflow(
  pushOrderToSalesforceWorkflowId,
  function (input: WorkflowData<{ orderId: string }>) {
    const prep = preparePushOrderStep({ orderId: input.orderId })

    const customer = ensureOrderCustomerSalesforceStep(
      transform({ prep }, ({ prep }) => ({
        skipped: prep.skipped,
        customerId: prep.customerId,
        medusaId: prep.medusaId,
      }))
    )

    const header = pushOrderHeaderSalesforceStep(
      transform({ prep, customer }, ({ prep, customer }) => ({ prep, customer }))
    )

    const lines = pushOrderLinesSalesforceStep(
      transform({ prep, customer, header }, ({ prep, customer, header }) => ({
        prep,
        customer,
        header,
      }))
    )

    const vouchers = pushOrderVouchersSalesforceStep(
      transform({ prep, header }, ({ prep, header }) => ({ prep, header }))
    )

    const activated = activateOrderSalesforceStep(
      transform({ prep, header }, ({ prep, header }) => ({ prep, header }))
    )

    const marked = markPushSuccessStep(
      transform({ prep, activated }, ({ prep, activated }) => ({
        skipped: prep.skipped,
        entityType: prep.entityType,
        medusaId: prep.medusaId,
        salesforceId: activated.salesforceOrderId,
      }))
    )

    return new WorkflowResponse(
      transform({ marked, lines, vouchers, activated }, ({ marked, lines, vouchers, activated }) => ({
        ...marked,
        lines,
        vouchers,
        activated,
      }))
    )
  }
)
