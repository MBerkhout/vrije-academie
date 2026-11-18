import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  accountHasCompleteMailingAddress,
  contactMailingFieldsFromAddress,
  medusaAddressUsableForSalesforce,
  personAccountAddressFieldsFromMedusaShape,
  SF_CONTACT_OBJECT,
  SF_PERSON_ACCOUNT_OBJECT,
  type SfAccountAddressShape,
} from "../../../modules/salesforce-sync/mappings/customer"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"
import { filterFieldsForConnectedOrg } from "../../../modules/salesforce-sync/utils/salesforce-describe-fields"
import {
  patchPersonAccountFields,
  updateContactWithDuplicateRetry,
} from "../../../modules/salesforce-sync/utils/patch-salesforce-person-address"
import { trackPushFailure } from "../track-push-failure"

import type { EnsureOrderCustomerOutput } from "./ensure-order-customer-salesforce-step"
import type { PreparePushOrderOutput } from "./prepare-push-order-step"

const ACCOUNT_MAILING_FIELDS = [
  "PersonMailingStreet",
  "PersonMailingCity",
  "PersonMailingPostalCode",
  "PersonMailingCountry",
  "BillingStreet",
  "BillingCity",
  "BillingPostalCode",
  "BillingCountry",
  "ShippingStreet",
  "ShippingCity",
  "ShippingPostalCode",
  "ShippingCountry",
] as const

export type SyncOrderAddressToPersonAccountInput = {
  prep: PreparePushOrderOutput
  customer: EnsureOrderCustomerOutput
}

export type SyncOrderAddressToPersonAccountOutput = EnsureOrderCustomerOutput & {
  addressSynced: boolean
}

export const syncOrderAddressToPersonAccountStep = createStep(
  {
    name: "sync-order-address-to-person-account",
    maxRetries: 5,
    retryInterval: 60,
  },
  trackPushFailure(
    "order",
    (i: SyncOrderAddressToPersonAccountInput) => i.prep.medusaId,
    async (input: SyncOrderAddressToPersonAccountInput, { container }) => {
      const passthrough: SyncOrderAddressToPersonAccountOutput = {
        ...input.customer,
        addressSynced: false,
      }

      if (
        input.prep.skipped ||
        input.customer.skipped ||
        !input.prep.payload ||
        !input.customer.salesforceAccountId ||
        !input.customer.salesforceContactId
      ) {
        return new StepResponse(passthrough)
      }

      const billing = input.prep.payload.billingAddress
      if (!medusaAddressUsableForSalesforce(billing)) {
        return new StepResponse(passthrough)
      }

      const sync = container.resolve("salesforceSync") as InstanceType<
        typeof SalesforceSyncModuleService
      >

      const accountRow = (await sync.retrieve(
        SF_PERSON_ACCOUNT_OBJECT,
        input.customer.salesforceAccountId,
        [...ACCOUNT_MAILING_FIELDS]
      )) as SfAccountAddressShape

      if (accountHasCompleteMailingAddress(accountRow)) {
        return new StepResponse(passthrough)
      }

      const accountFields = (await filterFieldsForConnectedOrg(
        SF_PERSON_ACCOUNT_OBJECT,
        personAccountAddressFieldsFromMedusaShape(billing) as Record<string, unknown>,
        "update"
      )) as Record<string, unknown>
      const contactFields = (await filterFieldsForConnectedOrg(
        SF_CONTACT_OBJECT,
        contactMailingFieldsFromAddress(billing) as Record<string, unknown>,
        "update"
      )) as Record<string, unknown>

      if (Object.keys(accountFields).length > 0) {
        await patchPersonAccountFields(sync, input.customer.salesforceAccountId, accountFields)
      }
      if (Object.keys(contactFields).length > 0) {
        await updateContactWithDuplicateRetry(
          sync,
          input.customer.salesforceContactId,
          contactFields
        )
      }

      return new StepResponse({
        ...input.customer,
        addressSynced: Object.keys(accountFields).length > 0 || Object.keys(contactFields).length > 0,
      })
    }
  )
)