import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

export type FetchSalesforceRecordInput = {
  salesforceObject: string
  salesforceId: string
  fields: string[]
}

export const fetchSalesforceRecordStep = createStep(
  { name: "fetch-salesforce-record", maxRetries: 5, retryInterval: 30 },
  async (input: FetchSalesforceRecordInput, { container }) => {
    const svc = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    const record = await svc.retrieve(input.salesforceObject, input.salesforceId, input.fields)
    return new StepResponse(record)
  }
)
