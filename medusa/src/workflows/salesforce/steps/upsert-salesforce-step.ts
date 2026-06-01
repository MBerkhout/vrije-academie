import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

export type UpsertSalesforceInput = {
  skipped?: boolean
  salesforceObject: string
  externalIdField: string
  externalId: string
  fields: Record<string, unknown>
}

/**
 * PATCH upsert on Salesforce. Retries on transient failures.
 */
export const upsertSalesforceStep = createStep(
  {
    name: "salesforce-upsert-object",
    maxRetries: 5,
    retryInterval: 60,
  },
  async (input: UpsertSalesforceInput, { container }) => {
    if (input.skipped) {
      return new StepResponse<{ skipped: boolean; salesforceId: string | null }>({
        skipped: true,
        salesforceId: null,
      })
    }
    const svc = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    const { id } = await svc.upsertByExternalId(
      input.salesforceObject,
      input.externalIdField,
      input.externalId,
      input.fields
    )
    return new StepResponse<{ skipped: boolean; salesforceId: string | null }>({
      skipped: false,
      salesforceId: id,
    })
  }
)
