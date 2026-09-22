import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { pushCustomerToSalesforceWorkflow } from "./push-customer-salesforce"
import { createWaitlistRegistrationStep } from "./steps/create-waitlist-registration-step"
import { prepareJoinWaitlistStep } from "./steps/prepare-join-waitlist-step"

/**
 * Historical workflow. Store waitlist signup uses `joinEventWaitlist` in-process
 * (`src/lib/waitlist/join-event-waitlist.ts`) so Salesforce IDs exist before Registration__c.
 */
export const joinEventWaitlistWorkflowId = "join-event-waitlist"

export type JoinEventWaitlistWorkflowInput = {
  handle: string
  quantity: number
  first_name: string
  last_name: string
  email: string
  phone: string
  variant_id?: string | null
  authenticatedCustomerId?: string | null
}

export const joinEventWaitlistWorkflow = createWorkflow(
  joinEventWaitlistWorkflowId,
  function (input: WorkflowData<JoinEventWaitlistWorkflowInput>) {
    const prep = prepareJoinWaitlistStep(input)

    const pushed = pushCustomerToSalesforceWorkflow.runAsStep({
      input: transform({ prep }, ({ prep }) => ({
        customerId: prep.customerId as string,
      })),
    })

    const registration = createWaitlistRegistrationStep(
      transform({ prep, pushed }, ({ prep }) => ({
        prep,
        customer: {
          skipped: false,
          salesforceAccountId: null,
          salesforceContactId: null,
        },
      }))
    )

    return new WorkflowResponse(registration)
  }
)
