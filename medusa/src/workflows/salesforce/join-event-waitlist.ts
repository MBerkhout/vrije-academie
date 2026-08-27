import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { createWaitlistRegistrationStep } from "./steps/create-waitlist-registration-step"
import { ensureOrderCustomerSalesforceStep } from "./steps/ensure-order-customer-salesforce-step"
import { prepareJoinWaitlistStep } from "./steps/prepare-join-waitlist-step"

export const joinEventWaitlistWorkflowId = "join-event-waitlist"

export type JoinEventWaitlistWorkflowInput = {
  handle: string
  quantity: number
  first_name: string
  last_name: string
  email: string
  phone: string
  authenticatedCustomerId?: string | null
}

export const joinEventWaitlistWorkflow = createWorkflow(
  joinEventWaitlistWorkflowId,
  function (input: WorkflowData<JoinEventWaitlistWorkflowInput>) {
    const prep = prepareJoinWaitlistStep(input)

    const customer = ensureOrderCustomerSalesforceStep(
      transform({ prep }, ({ prep }) => ({
        skipped: prep.skipped,
        customerId: prep.customerId,
        medusaId: prep.medusaId,
      }))
    )

    const registration = createWaitlistRegistrationStep(
      transform({ prep, customer }, ({ prep, customer }) => ({ prep, customer }))
    )

    return new WorkflowResponse(registration)
  }
)
