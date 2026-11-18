import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { SF_CONTACT_OBJECT, SF_PERSON_ACCOUNT_OBJECT } from "../../../modules/salesforce-sync/mappings/customer"
import { filterFieldsForConnectedOrg } from "../../../modules/salesforce-sync/utils/salesforce-describe-fields"
import {
  patchPersonAccountFields,
  updateContactWithDuplicateRetry,
} from "../../../modules/salesforce-sync/utils/patch-salesforce-person-address"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

import type { PreparePushCustomerOutput } from "./prepare-push-customer-step"

export type PushCustomerToSalesforceInput = PreparePushCustomerOutput

export type PushCustomerToSalesforceOutput = {
  skipped: boolean
  salesforceContactId: string | null
  salesforceAccountId: string | null
}

export const pushCustomerToSalesforceStep = createStep(
  {
    name: "push-customer-to-salesforce",
    maxRetries: 5,
    retryInterval: 60,
  },
  async (input: PushCustomerToSalesforceInput, { container }) => {
    if (input.skipped) {
      return new StepResponse<PushCustomerToSalesforceOutput>({
        skipped: true,
        salesforceContactId: input.salesforceContactId,
        salesforceAccountId: input.salesforceAccountId,
      })
    }

    const svc = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >

    // Drop fields that don't exist / aren't writable in the connected org (e.g. Newsletter__c missing on Account).
    const writeMode = input.mode === "create" ? "create" : "update"
    input = {
      ...input,
      accountFields: await filterFieldsForConnectedOrg(SF_PERSON_ACCOUNT_OBJECT, input.accountFields, writeMode),
      contactFields: await filterFieldsForConnectedOrg(SF_CONTACT_OBJECT, input.contactFields, writeMode),
    }

    const expectedEmail =
      typeof input.accountFields.PersonEmail === "string"
        ? input.accountFields.PersonEmail
        : typeof input.contactFields.Email === "string"
          ? input.contactFields.Email
          : ""

    if (input.mode === "create") {
      const { accountId, contactId, linkedExisting } = await svc.createPersonAccount(
        input.accountFields,
        expectedEmail
      )

      if (linkedExisting && Object.keys(input.accountFields).length > 0) {
        await patchPersonAccountFields(svc, accountId, input.accountFields)
      }

      if (Object.keys(input.contactFields).length > 0) {
        await updateContactWithDuplicateRetry(svc, contactId, input.contactFields)
      }

      return new StepResponse<PushCustomerToSalesforceOutput>({
        skipped: false,
        salesforceContactId: contactId,
        salesforceAccountId: accountId,
      })
    }

    const accountId = input.salesforceAccountId
    const contactId = input.salesforceContactId
    if (!accountId || !contactId) {
      throw new Error(
        `Customer ${input.medusaId} missing Salesforce link for update (contact=${contactId ?? ""} account=${accountId ?? ""})`
      )
    }

    if (Object.keys(input.accountFields).length > 0) {
      await patchPersonAccountFields(svc, accountId, input.accountFields)
    }
    if (Object.keys(input.contactFields).length > 0) {
      await updateContactWithDuplicateRetry(svc, contactId, input.contactFields)
    }

    return new StepResponse<PushCustomerToSalesforceOutput>({
      skipped: false,
      salesforceContactId: contactId,
      salesforceAccountId: accountId,
    })
  }
)
