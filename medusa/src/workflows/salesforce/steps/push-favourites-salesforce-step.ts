import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { firstWorkflowError } from "../../../lib/workflow-failure"
import { trackPushFailure } from "../track-push-failure"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"
import { syncFavouritesToSalesforce } from "../../../modules/salesforce-sync/utils/sync-favourites-to-salesforce"
import { pushCustomerToSalesforceWorkflow } from "../push-customer-salesforce"

import type { PreparePushFavouritesOutput } from "./prepare-push-favourites-step"

export type PushFavouritesOutput = {
  skipped: boolean
  created: number
  deleted: number
}

export const pushFavouritesSalesforceStep = createStep(
  { name: "push-favourites-salesforce", maxRetries: 3, retryInterval: 15 },
  trackPushFailure(
    "customer",
    (i: PreparePushFavouritesOutput) => i.customerId,
    async (input: PreparePushFavouritesOutput, { container }) => {
      if (input.skipped) {
        return new StepResponse<PushFavouritesOutput>({
          skipped: true,
          created: 0,
          deleted: 0,
        })
      }

      const sync = container.resolve("salesforceSync") as InstanceType<
        typeof SalesforceSyncModuleService
      >
      let contactId = input.contactId?.trim() || null
      let accountId = input.accountId?.trim() || null

      if (!contactId || !accountId) {
        const ret = await pushCustomerToSalesforceWorkflow(container).run({
          input: { customerId: input.customerId },
          throwOnError: false,
        })
        const failure = firstWorkflowError(ret)
        if (failure) throw failure
        const row = await sync.getStateByMedusaId("customer", input.customerId)
        contactId = row?.salesforce_id?.trim() || null
        accountId = row?.salesforce_account_id?.trim() || null
      }

      if (!contactId) {
        throw new Error(
          `Customer ${input.customerId} has no Salesforce Contact — cannot sync Favourite__c`
        )
      }

      const result = await syncFavouritesToSalesforce(
        container,
        input.customerId,
        contactId,
        accountId
      )

      return new StepResponse<PushFavouritesOutput>({
        skipped: result.skipped,
        created: result.created,
        deleted: result.deleted,
      })
    }
  )
)
