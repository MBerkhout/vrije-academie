import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { applyProductgroupFromSalesforceStep } from "./steps/apply-productgroup-from-salesforce-step"
import { fetchCourseProductsSalesforceStep } from "./steps/fetch-course-products-salesforce-step"
import { fetchLinkedOnlineChildrenSalesforceStep } from "./steps/fetch-linked-online-children-step"
import { fetchSalesforceRecordStep } from "./steps/fetch-salesforce-record-step"
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

    const linkedOnline = fetchLinkedOnlineChildrenSalesforceStep(
      transform({ groupRecord }, ({ groupRecord }) => ({
        groupRecord,
      }))
    )

    const applied = applyProductgroupFromSalesforceStep(
      transform(
        { input, groupRecord, childRecords, linkedOnline },
        ({ input, groupRecord, childRecords, linkedOnline }) => ({
          salesforceId: input.salesforceId,
          groupRecord,
          childRecords,
          linkedGroupRecord: linkedOnline.linkedGroupRecord,
          linkedChildRecords: linkedOnline.linkedChildRecords,
          manual: input.manual ?? true,
        })
      )
    )

    return new WorkflowResponse(applied)
  }
)
