import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"

import { customerMapping } from "../../../modules/salesforce-sync/mappings/customer"
import type { SfContactShape } from "../../../modules/salesforce-sync/mappings/customer"

export type ApplyCustomerFromSfInput = {
  medusaId: string
  record: Record<string, unknown>
}

export const applyCustomerFromSalesforceStep = createStep(
  { name: "apply-customer-from-salesforce", maxRetries: 3, retryInterval: 30 },
  async (input: ApplyCustomerFromSfInput, { container }) => {
    const sf = input.record as SfContactShape
    const update = customerMapping.fromSalesforce(sf)
    const clean: Record<string, unknown> = {}
    if (update.first_name !== undefined) clean.first_name = update.first_name
    if (update.last_name !== undefined) clean.last_name = update.last_name
    if (update.email !== undefined) clean.email = update.email
    if (update.phone !== undefined) clean.phone = update.phone

    if (Object.keys(clean).length === 0) {
      return new StepResponse<{ updated: boolean }>({ updated: false })
    }

    await updateCustomersWorkflow(container).run({
      input: {
        selector: { id: [input.medusaId] },
        update: clean as {
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
        },
      },
    })
    return new StepResponse<{ updated: boolean }>({ updated: true })
  }
)
