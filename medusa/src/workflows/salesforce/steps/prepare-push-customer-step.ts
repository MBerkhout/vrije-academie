import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import {
  contactFieldsFromMedusa,
  customerPushPayloadFingerprint,
  personAccountFieldsFromMedusa,
  resolvePersonAccountRecordTypeId,
  SF_PERSON_ACCOUNT_OBJECT,
  type MedusaCustomerShape,
} from "../../../modules/salesforce-sync/mappings/customer"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

export type PreparePushCustomerInput = { customerId: string; isCreate?: boolean }

export type PreparePushCustomerOutput = {
  skipped: boolean
  skipReason?: string
  mode: "create" | "update"
  entityType: "customer"
  medusaId: string
  salesforceContactId: string | null
  salesforceAccountId: string | null
  accountFields: Record<string, unknown>
  contactFields: Record<string, unknown>
  payloadFingerprint: string
}

function pickDefaultAddress(
  addresses: Array<{
    is_default_shipping?: boolean | null
    address_1?: string | null
    postal_code?: string | null
    city?: string | null
    country_code?: string | null
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
  }>
) {
  return addresses.find((a) => a.is_default_shipping) ?? addresses[0] ?? null
}

export const preparePushCustomerStep = createStep(
  { name: "prepare-push-customer", maxRetries: 2, retryInterval: 5 },
  async (input: PreparePushCustomerInput, { container }) => {
    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >
    const row = await sync.getStateByMedusaId("customer", input.customerId)
    if (row?.incoming_lock_until && new Date(row.incoming_lock_until) > new Date()) {
      const out: PreparePushCustomerOutput = {
        skipped: true,
        skipReason: "incoming_lock",
        mode: row.salesforce_id ? "update" : "create",
        entityType: "customer",
        medusaId: input.customerId,
        salesforceContactId: row.salesforce_id ?? null,
        salesforceAccountId: row.salesforce_account_id ?? null,
        accountFields: {},
        contactFields: {},
        payloadFingerprint: "",
      }
      return new StepResponse(out)
    }

    const customerService = container.resolve(Modules.CUSTOMER)
    const customers = await customerService.listCustomers({ id: input.customerId }, { take: 1 })
    const customer = customers[0]
    if (!customer) {
      throw new Error(`Customer ${input.customerId} not found`)
    }

    const addresses = await customerService.listCustomerAddresses({
      customer_id: input.customerId,
    })
    const defaultAddress = pickDefaultAddress(addresses)
    const shape: MedusaCustomerShape = {
      id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      metadata: (customer.metadata ?? null) as Record<string, unknown> | null,
      address: defaultAddress
        ? {
            address_1: defaultAddress.address_1,
            postal_code: defaultAddress.postal_code,
            city: defaultAddress.city,
            country_code: defaultAddress.country_code,
            first_name: defaultAddress.first_name,
            last_name: defaultAddress.last_name,
            phone: defaultAddress.phone,
          }
        : null,
    }

    const payloadFingerprint = customerPushPayloadFingerprint(shape)
    let hasSalesforceLink = !!row?.salesforce_id
    let mode: "create" | "update" = hasSalesforceLink ? "update" : "create"
    let salesforceContactId = row?.salesforce_id ?? null
    let salesforceAccountId = row?.salesforce_account_id ?? null

    if (mode === "update" && salesforceAccountId && shape.email?.trim()) {
      const linkedEmail = await sync.getPersonAccountEmail(salesforceAccountId)
      const medusaEmail = sync.normalizeSalesforceEmail(shape.email)
      if (linkedEmail && linkedEmail !== medusaEmail) {
        mode = "create"
        hasSalesforceLink = false
        salesforceContactId = null
        salesforceAccountId = null
      }
    }

    if (mode === "create" && shape.email?.trim()) {
      const existing =
        (await sync.findPersonAccountByEmail(shape.email.trim())) ??
        (await (async () => {
          const contactId = await sync.findContactIdByEmail(shape.email!.trim())
          if (!contactId) return null
          const contact = await sync.retrieve("Contact", contactId, ["AccountId"])
          const accountId =
            typeof contact.AccountId === "string" ? contact.AccountId.trim() : ""
          return accountId && contactId ? { accountId, contactId } : null
        })())
      if (existing) {
        mode = "update"
        hasSalesforceLink = true
        salesforceContactId = existing.contactId
        salesforceAccountId = existing.accountId
      }
    }

    if (mode === "update" && row?.mapping_version === payloadFingerprint && !input.isCreate) {
      const out: PreparePushCustomerOutput = {
        skipped: true,
        skipReason: "unchanged",
        mode,
        entityType: "customer",
        medusaId: input.customerId,
        salesforceContactId: salesforceContactId ?? row?.salesforce_id ?? null,
        salesforceAccountId: salesforceAccountId ?? row?.salesforce_account_id ?? null,
        accountFields: {},
        contactFields: {},
        payloadFingerprint,
      }
      return new StepResponse(out)
    }

    if (mode === "create" && !shape.email?.trim()) {
      const out: PreparePushCustomerOutput = {
        skipped: true,
        skipReason: "missing_email",
        mode,
        entityType: "customer",
        medusaId: input.customerId,
        salesforceContactId: null,
        salesforceAccountId: null,
        accountFields: {},
        contactFields: {},
        payloadFingerprint,
      }
      return new StepResponse(out)
    }

    const recordTypeId = mode === "create" ? resolvePersonAccountRecordTypeId() : undefined
    const accountFields = personAccountFieldsFromMedusa(shape, recordTypeId) as Record<
      string,
      unknown
    >
    const contactFields = contactFieldsFromMedusa(shape) as Record<string, unknown>

    const out: PreparePushCustomerOutput = {
      skipped: false,
      mode,
      entityType: "customer",
      medusaId: input.customerId,
      salesforceContactId,
      salesforceAccountId,
      accountFields,
      contactFields,
      payloadFingerprint,
    }
    return new StepResponse(out)
  }
)
