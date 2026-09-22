import type { ICustomerModuleService, MedusaContainer } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import { eventIsFullySoldOut } from "../event-sold-out"
import { buildStoreEventDetail } from "../store-event-detail"
import {
  personAccountFieldsFromMedusa,
  resolvePersonAccountRecordTypeId,
  SF_CONTACT_OBJECT,
  type MedusaCustomerShape,
} from "../../modules/salesforce-sync/mappings/customer"
import {
  registrationExternalIdField,
  SF_REGISTRATION_OBJECT,
  waitlistRegistrationToSalesforce,
} from "../../modules/salesforce-sync/mappings/registration"
import SalesforceSyncModuleService from "../../modules/salesforce-sync/service"
import { buildWaitlistRegistrationExternalId } from "../../modules/salesforce-sync/utils/build-registration-id"
import {
  ensureSyncState,
  findSalesforceIdByExternalId,
  resolveExistingSalesforceId,
  upsertSalesforceRecordById,
} from "../../modules/salesforce-sync/utils/upsert-record"
import { resolveWaitlistCustomer } from "./resolve-waitlist-customer"
import { resolveWaitlistVaProductId } from "./resolve-waitlist-va-product"

export type JoinEventWaitlistInput = {
  handle: string
  quantity: number
  first_name: string
  last_name: string
  email: string
  phone: string
  variant_id?: string | null
  authenticatedCustomerId?: string | null
}

export type JoinEventWaitlistResult = {
  salesforceRegistrationId: string
}

async function ensureWaitlistCustomerSalesforceIds(
  container: MedusaContainer,
  customerId: string
): Promise<{ accountId: string; contactId: string }> {
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  const existing = await sync.getStateByMedusaId("customer", customerId)
  if (existing?.salesforce_id?.trim() && existing.salesforce_account_id?.trim()) {
    return {
      accountId: existing.salesforce_account_id.trim(),
      contactId: existing.salesforce_id.trim(),
    }
  }

  const customerService = container.resolve(Modules.CUSTOMER) as ICustomerModuleService
  const customers = await customerService.listCustomers({ id: customerId }, { take: 1 })
  const customer = customers[0]
  if (!customer?.email?.trim()) {
    throw new Error(`Customer ${customerId} has no email for Salesforce waitlist`)
  }

  const shape: MedusaCustomerShape = {
    id: customer.id,
    first_name: customer.first_name,
    last_name: customer.last_name,
    email: customer.email,
    phone: customer.phone,
    metadata: (customer.metadata ?? null) as Record<string, unknown> | null,
    address: null,
  }

  const linked =
    (await sync.findPersonAccountByEmail(customer.email.trim())) ??
    (await (async () => {
      const contactId = await sync.findContactIdByEmail(customer.email!.trim())
      if (!contactId) return null
      const contact = await sync.retrieve("Contact", contactId, ["AccountId"])
      const accountId = typeof contact.AccountId === "string" ? contact.AccountId.trim() : ""
      return accountId ? { accountId, contactId } : null
    })())

  const accountFields = personAccountFieldsFromMedusa(
    shape,
    resolvePersonAccountRecordTypeId()
  ) as Record<string, unknown>
  delete accountFields.Newsletter__c

  const ids = linked
    ? linked
    : await sync.createPersonAccount(accountFields, customer.email.trim())

  try {
    await sync.updateRecord(SF_CONTACT_OBJECT, ids.contactId, { Newsletter__c: true })
  } catch {
    /* Newsletter__c may be Account-only or unavailable in some orgs */
  }

  const payload = {
    entity_type: "customer",
    medusa_id: customerId,
    salesforce_id: ids.contactId,
    salesforce_account_id: ids.accountId,
    last_pushed_at: new Date(),
    last_status: "success",
    last_error: null,
    failure_count: 0,
    severity: null,
    next_retry_at: null,
  }
  const row = await sync.getStateByMedusaId("customer", customerId)
  if (!row) {
    await sync.createSalesforceSyncStates([payload])
  } else {
    await sync.updateSalesforceSyncStates({ id: row.id, ...payload })
  }

  return { accountId: ids.accountId, contactId: ids.contactId }
}

/**
 * Waitlist signup without a parent workflow. Nested workflow.run / runAsStep from
 * inside join-event-waitlist returned before Salesforce IDs were written.
 */
export async function joinEventWaitlist(
  container: MedusaContainer,
  input: JoinEventWaitlistInput
): Promise<JoinEventWaitlistResult> {
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 99) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Quantity must be an integer between 1 and 99"
    )
  }

  const event = await buildStoreEventDetail(container, input.handle)
  if (!event) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Event not found")
  }

  const variantId = input.variant_id?.trim() || null

  if (!variantId) {
    const soldOut = eventIsFullySoldOut({
      record_type: event.record_type as string | null | undefined,
      purchase_mode: event.purchase_mode as string | null | undefined,
      min_available_quantity: event.min_available_quantity as number | null | undefined,
      variants: event.variants as Parameters<typeof eventIsFullySoldOut>[0]["variants"],
      bundle_variant_id: event.bundle_variant_id as string | null | undefined,
    })

    if (!soldOut) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Waitlist signup is only available when the activity is fully sold out"
      )
    }
  }

  const { customerId } = await resolveWaitlistCustomer(container, {
    email: input.email,
    first_name: input.first_name,
    last_name: input.last_name,
    phone: input.phone,
    authenticatedCustomerId: input.authenticatedCustomerId,
  })

  const { vaProductId } = await resolveWaitlistVaProductId(container, input.handle, variantId)
  const email = input.email.trim().toLowerCase()
  const registrationExternalId = buildWaitlistRegistrationExternalId(customerId, vaProductId)

  const { accountId, contactId } = await ensureWaitlistCustomerSalesforceIds(
    container,
    customerId
  )
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  let regSfId = await resolveExistingSalesforceId(sync, "registration", registrationExternalId, () =>
    findSalesforceIdByExternalId(
      sync,
      SF_REGISTRATION_OBJECT,
      registrationExternalIdField,
      registrationExternalId
    )
  )

  const fields = waitlistRegistrationToSalesforce({
    externalId: registrationExternalId,
    accountId,
    contactId,
    vaProductId,
    quantity: input.quantity,
    participantEmail: email,
  })

  regSfId = await upsertSalesforceRecordById(
    sync,
    SF_REGISTRATION_OBJECT,
    regSfId,
    registrationExternalIdField,
    registrationExternalId,
    fields as Record<string, unknown>
  )

  await ensureSyncState(sync, "registration", registrationExternalId, regSfId)

  return { salesforceRegistrationId: regSfId }
}
