import {
  createWorkflow,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { preparePushFavouritesStep } from "./steps/prepare-push-favourites-step"
import { pushFavouritesSalesforceStep } from "./steps/push-favourites-salesforce-step"

export const pushFavouritesToSalesforceWorkflowId = "push-favourites-salesforce"

export type PushFavouritesToSalesforceInput = {
  customerId: string
}

export const pushFavouritesToSalesforceWorkflow = createWorkflow(
  pushFavouritesToSalesforceWorkflowId,
  function (input: WorkflowData<PushFavouritesToSalesforceInput>) {
    const prep = preparePushFavouritesStep(input)
    const pushed = pushFavouritesSalesforceStep(prep)
    return new WorkflowResponse(pushed)
  }
)
