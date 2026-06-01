import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { applyProductgroupFromSalesforceStep } from "./steps/apply-productgroup-from-salesforce-step"
import { fetchCourseProductsSalesforceStep } from "./steps/fetch-course-products-salesforce-step"
import { fetchSalesforceRecordStep } from "./steps/fetch-salesforce-record-step"
import { syncSanityAfterProductgroupImportStep } from "./steps/sync-sanity-after-productgroup-import-step"
import {
  productgroupSalesforceFieldsForPull,
  SF_PRODUCTGROUP_OBJECT,
} from "../../modules/salesforce-sync/mappings/productgroup"

export const pullProductgroupFromSalesforceWorkflowId = "pull-productgroup-salesforce"

export type PullProductgroupFromSalesforceInput = {
  salesforceId: string
  /** Manual imports bypass the future-only auto-sync guard. */
  manual?: boolean
}

export const pullProductgroupFromSalesforceWorkflow = createWorkflow(
  pullProductgroupFromSalesforceWorkflowId,
  function (input: WorkflowData<PullProductgroupFromSalesforceInput>) {
    const groupRecord = fetchSalesforceRecordStep(
      transform({ input }, ({ input }) => ({
        salesforceObject: SF_PRODUCTGROUP_OBJECT,
        salesforceId: input.salesforceId,
        fields: [...productgroupSalesforceFieldsForPull],
      }))
    )

    const childRecords = fetchCourseProductsSalesforceStep(
      transform({ input }, ({ input }) => ({
        productgroupSalesforceId: input.salesforceId,
      }))
    )

    const applied = applyProductgroupFromSalesforceStep(
      transform({ input, groupRecord, childRecords }, ({ input, groupRecord, childRecords }) => ({
        salesforceId: input.salesforceId,
        groupRecord,
        childRecords,
        manual: input.manual ?? true,
      }))
    )

    syncSanityAfterProductgroupImportStep(
      transform({ applied }, ({ applied }) => ({
        skipped: applied.skipped,
        medusaId: applied.medusaId,
      }))
    )

    return new WorkflowResponse(applied)
  }
)
