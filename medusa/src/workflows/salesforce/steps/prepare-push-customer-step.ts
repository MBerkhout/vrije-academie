import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import { customerMapping } from "../../../modules/salesforce-sync/mappings/customer"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

import type { MedusaCustomerShape } from "../../../modules/salesforce-sync/mappings/customer"
import type { UpsertSalesforceInput } from "./upsert-salesforce-step"

export type PreparePushCustomerInput = { customerId: string }

export type PreparePushCustomerOutput = UpsertSalesforceInput & {
  entityType: "customer"
  medusaId: string
}

export const preparePushCustomerStep = createStep(
  { name: "prepare-push-customer", maxRetries: 2, retryInterval: 5 },
  async (input: PreparePushCustomerInput, { container }) => {
    const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    const row = await sync.getStateByMedusaId("customer", input.customerId)
    if (row?.incoming_lock_until && new Date(row.incoming_lock_until) > new Date()) {
      const out: PreparePushCustomerOutput = {
        skipped: true,
        salesforceObject: "Contact",
        externalIdField: customerMapping.externalIdField,
        externalId: input.customerId,
        fields: {},
        entityType: "customer",
        medusaId: input.customerId,
      }
      return new StepResponse(out)
    }

    const customerService = container.resolve(Modules.CUSTOMER)
    const [customer] = await customerService.listCustomers({ id: input.customerId })
    if (!customer) {
      throw new Error(`Customer ${input.customerId} not found`)
    }

    const c = customer as MedusaCustomerShape
    const fields = customerMapping.toSalesforce({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone,
    }) as Record<string, unknown>

    const out: PreparePushCustomerOutput = {
      skipped: false,
      salesforceObject: "Contact",
      externalIdField: customerMapping.externalIdField,
      externalId: input.customerId,
      fields,
      entityType: "customer",
      medusaId: input.customerId,
    }
    return new StepResponse(out)
  }
)
