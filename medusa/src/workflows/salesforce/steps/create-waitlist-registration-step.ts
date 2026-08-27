import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  registrationExternalIdField,
  SF_REGISTRATION_OBJECT,
  waitlistRegistrationToSalesforce,
} from "../../../modules/salesforce-sync/mappings/registration"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"
import {
  ensureSyncState,
  findSalesforceIdByExternalId,
  resolveExistingSalesforceId,
  upsertSalesforceRecordById,
} from "../../../modules/salesforce-sync/utils/upsert-record"

import type { EnsureOrderCustomerOutput } from "./ensure-order-customer-salesforce-step"
import type { PrepareJoinWaitlistOutput } from "./prepare-join-waitlist-step"

export type CreateWaitlistRegistrationInput = {
  prep: PrepareJoinWaitlistOutput
  customer: EnsureOrderCustomerOutput
}

export type CreateWaitlistRegistrationOutput = {
  skipped: boolean
  salesforceRegistrationId: string | null
}

export const createWaitlistRegistrationStep = createStep(
  { name: "create-waitlist-registration", maxRetries: 5, retryInterval: 30 },
  async (input: CreateWaitlistRegistrationInput, { container }) => {
    if (
      input.prep.skipped ||
      !input.prep.customerId ||
      !input.prep.vaProductId ||
      !input.prep.registrationExternalId ||
      input.customer.skipped ||
      !input.customer.salesforceAccountId ||
      !input.customer.salesforceContactId
    ) {
      return new StepResponse<CreateWaitlistRegistrationOutput>({
        skipped: true,
        salesforceRegistrationId: null,
      })
    }

    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >

    const externalId = input.prep.registrationExternalId
    let regSfId = await resolveExistingSalesforceId(sync, "registration", externalId, () =>
      findSalesforceIdByExternalId(sync, SF_REGISTRATION_OBJECT, registrationExternalIdField, externalId)
    )

    const fields = waitlistRegistrationToSalesforce({
      externalId,
      accountId: input.customer.salesforceAccountId,
      contactId: input.customer.salesforceContactId,
      vaProductId: input.prep.vaProductId,
      quantity: input.prep.quantity,
      participantEmail: input.prep.email,
    })

    regSfId = await upsertSalesforceRecordById(
      sync,
      SF_REGISTRATION_OBJECT,
      regSfId,
      registrationExternalIdField,
      externalId,
      fields as Record<string, unknown>
    )

    await ensureSyncState(sync, "registration", externalId, regSfId)

    return new StepResponse<CreateWaitlistRegistrationOutput>({
      skipped: false,
      salesforceRegistrationId: regSfId,
    })
  }
)
