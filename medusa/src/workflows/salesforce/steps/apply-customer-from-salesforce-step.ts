import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import {
  contactWithAccountMailing,
  customerProfileFromSalesforce,
  type SfContactShape,
} from "../../../modules/salesforce-sync/mappings/customer"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

const INCOMING_LOCK_MS = 10_000

export type ApplyCustomerFromSfInput = {
  /** When omitted, import-create mode (bulk import / webhook). */
  medusaId?: string | null
  salesforceId: string
  record: Record<string, unknown>
}

export type ApplyCustomerFromSfOutput = {
  medusaId: string
  salesforceAccountId: string | null
  created: boolean
  updated: boolean
}

async function setIncomingLock(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  medusaId: string,
  salesforceId: string,
  salesforceAccountId?: string | null
): Promise<void> {
  const until = new Date(Date.now() + INCOMING_LOCK_MS)
  let row = await sync.getStateByMedusaId("customer", medusaId)
  if (!row) {
    await sync.createSalesforceSyncStates([
      {
        entity_type: "customer",
        medusa_id: medusaId,
        salesforce_id: salesforceId,
        salesforce_account_id: salesforceAccountId ?? null,
        incoming_lock_until: until,
        last_status: "retrying",
      },
    ])
    return
  }
  await sync.updateSalesforceSyncStates({
    id: row.id,
    salesforce_id: salesforceId,
    salesforce_account_id: salesforceAccountId ?? row.salesforce_account_id,
    incoming_lock_until: until,
    last_status: "retrying",
  })
}

async function upsertDefaultAddress(
  customerService: ICustomerModuleService,
  customerId: string,
  address: NonNullable<ReturnType<typeof customerProfileFromSalesforce>["address"]>,
  profile: { first_name?: string; last_name?: string; phone?: string }
): Promise<void> {
  const addresses = await customerService.listCustomerAddresses({ customer_id: customerId })
  const existing =
    addresses.find((a) => a.is_default_shipping) ?? addresses[0] ?? null

  const payload = {
    customer_id: customerId,
    address_1: address.address_1 ?? "",
    postal_code: address.postal_code ?? "",
    city: address.city ?? "",
    country_code: address.country_code ?? "nl",
    first_name: address.first_name ?? profile.first_name ?? "",
    last_name: address.last_name ?? profile.last_name ?? "",
    ...(address.phone?.trim() || profile.phone?.trim()
      ? { phone: address.phone?.trim() || profile.phone?.trim() }
      : {}),
    is_default_shipping: true,
    is_default_billing: true,
  }

  if (existing?.id) {
    await customerService.updateCustomerAddresses(existing.id, payload)
    return
  }

  await customerService.createCustomerAddresses([payload])
}

export const applyCustomerFromSalesforceStep = createStep(
  { name: "apply-customer-from-salesforce", maxRetries: 3, retryInterval: 30 },
  async (input: ApplyCustomerFromSfInput, { container }) => {
    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >
    const customerService = container.resolve(Modules.CUSTOMER) as ICustomerModuleService
    let sf = input.record as SfContactShape
    const salesforceAccountId = sf.AccountId?.trim() || null

    if (salesforceAccountId) {
      const account = await sync.retrieve("Account", salesforceAccountId, [
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
      ])
      sf = contactWithAccountMailing(sf, account)
    }

    const mapped = customerProfileFromSalesforce(sf)

    let targetMedusaId = input.medusaId?.trim() || null
    let created = false

    if (!targetMedusaId) {
      const linked = await sync.getStateBySalesforceId("customer", input.salesforceId)
      targetMedusaId = linked?.medusa_id ?? null
    }

    if (targetMedusaId) {
      await setIncomingLock(sync, targetMedusaId, input.salesforceId, salesforceAccountId)

      const [existing] = await customerService.listCustomers({ id: targetMedusaId }, { take: 1 })
      const mergedMetadata = {
        ...(existing?.metadata ?? {}),
        ...(mapped.metadata ?? {}),
      }

      const clean: Record<string, unknown> = {}
      if (mapped.first_name !== undefined) clean.first_name = mapped.first_name
      if (mapped.last_name !== undefined) clean.last_name = mapped.last_name
      if (mapped.email !== undefined) clean.email = mapped.email
      if (mapped.phone !== undefined) clean.phone = mapped.phone
      if (Object.keys(mergedMetadata).length) clean.metadata = mergedMetadata

      let updated = false
      if (Object.keys(clean).length > 0) {
        await updateCustomersWorkflow(container).run({
          input: {
            selector: { id: [targetMedusaId] },
            update: clean as {
              first_name?: string
              last_name?: string
              email?: string
              phone?: string
              metadata?: Record<string, unknown>
            },
          },
        })
        updated = true
      }

      if (mapped.address) {
        await upsertDefaultAddress(customerService, targetMedusaId, mapped.address, mapped)
        updated = true
      }

      return new StepResponse<ApplyCustomerFromSfOutput>({
        medusaId: targetMedusaId,
        salesforceAccountId,
        created: false,
        updated,
      })
    }

    if (!mapped.email) {
      throw new Error(
        `Salesforce Contact ${input.salesforceId} has no email — cannot import customer`
      )
    }

    const [customer] = await customerService.createCustomers([
      {
        email: mapped.email,
        first_name: mapped.first_name ?? "Unknown",
        last_name: mapped.last_name ?? "-",
        ...(mapped.phone ? { phone: mapped.phone } : {}),
        ...(mapped.metadata ? { metadata: mapped.metadata } : {}),
      },
    ])

    targetMedusaId = customer.id
    await setIncomingLock(sync, targetMedusaId, input.salesforceId, salesforceAccountId)

    if (mapped.address) {
      await upsertDefaultAddress(customerService, customer.id, mapped.address, mapped)
    }

    created = true

    return new StepResponse<ApplyCustomerFromSfOutput>({
      medusaId: customer.id,
      salesforceAccountId,
      created,
      updated: false,
    })
  }
)
