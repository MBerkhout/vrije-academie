import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  SF_CONTACT_OBJECT,
  SF_PERSON_ACCOUNT_OBJECT,
  splitAccountPushFields,
} from "../../../modules/salesforce-sync/mappings/customer"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

import type { PreparePushCustomerOutput } from "./prepare-push-customer-step"

export type PushCustomerToSalesforceInput = PreparePushCustomerOutput

export type PushCustomerToSalesforceOutput = {
  skipped: boolean
  salesforceContactId: string | null
  salesforceAccountId: string | null
}

async function updateAccountWithDuplicateRetry(
  svc: InstanceType<typeof SalesforceSyncModuleService>,
  accountId: string,
  fields: Record<string, unknown>
): Promise<void> {
  if (Object.keys(fields).length === 0) return
  try {
    await svc.updateRecord(SF_PERSON_ACCOUNT_OBJECT, accountId, fields)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes("DUPLICATES_DETECTED")) throw err
    await svc.updateRecord(SF_PERSON_ACCOUNT_OBJECT, accountId, fields, {
      allowDuplicateSave: true,
    })
  }
}

async function updateContactWithDuplicateRetry(
  svc: InstanceType<typeof SalesforceSyncModuleService>,
  contactId: string,
  fields: Record<string, unknown>
): Promise<void> {
  if (Object.keys(fields).length === 0) return
  try {
    await svc.updateRecord(SF_CONTACT_OBJECT, contactId, fields)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes("DUPLICATES_DETECTED")) throw err
    await svc.updateRecord(SF_CONTACT_OBJECT, contactId, fields, {
      allowDuplicateSave: true,
    })
  }
}

async function patchAccountFields(
  svc: InstanceType<typeof SalesforceSyncModuleService>,
  accountId: string,
  accountFields: Record<string, unknown>
): Promise<void> {
  if (Object.keys(accountFields).length === 0) return

  const { profileFields, addressFields } = splitAccountPushFields(accountFields)
  await updateAccountWithDuplicateRetry(svc, accountId, profileFields)
  await updateAccountWithDuplicateRetry(svc, accountId, addressFields)
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
        await patchAccountFields(svc, accountId, input.accountFields)
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
      await patchAccountFields(svc, accountId, input.accountFields)
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
