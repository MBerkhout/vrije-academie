import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { importProductgroupFromSalesforce } from "../../../modules/salesforce-sync/import-productgroup"
import { captureWithContext } from "../../../lib/sentry"

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
    try {
      const result = await importProductgroupFromSalesforce(container, {
        salesforceId: input.salesforceId,
        groupRecord: input.groupRecord,
        childRecords: input.childRecords,
        linkedGroupRecord: input.linkedGroupRecord ?? null,
        linkedChildRecords: input.linkedChildRecords ?? [],
        manual: input.manual,
      })
      return new StepResponse(result)
    } catch (err) {
      // The workflow engine retries failed steps in the background and `run` returns without an
      // error, so reportSalesforceFailure never fires. Report every failed attempt here.
      captureWithContext(err, {
        tags: {
          kind: "workflow",
          flow: "salesforce-sync",
          entity_type: "productgroup",
          workflow: "pull-productgroup-salesforce",
        },
        extra: { salesforce_id: input.salesforceId },
      })
      throw err
    }
  }
)
