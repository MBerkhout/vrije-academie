import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { importProductgroupFromSalesforce } from "../../../modules/salesforce-sync/import-productgroup"

export type ApplyProductgroupInput = {
  salesforceId: string
  groupRecord: Record<string, unknown>
  childRecords: Record<string, unknown>[]
  linkedGroupRecord?: Record<string, unknown> | null
  linkedChildRecords?: Record<string, unknown>[]
  manual?: boolean
}

export const applyProductgroupFromSalesforceStep = createStep(
  { name: "apply-productgroup-from-salesforce", maxRetries: 3, retryInterval: 30 },
  async (input: ApplyProductgroupInput, { container }) => {
    const result = await importProductgroupFromSalesforce(container, {
      salesforceId: input.salesforceId,
      groupRecord: input.groupRecord,
      childRecords: input.childRecords,
      linkedGroupRecord: input.linkedGroupRecord ?? null,
      linkedChildRecords: input.linkedChildRecords ?? [],
      manual: input.manual,
    })
    return new StepResponse(result)
  }
)
