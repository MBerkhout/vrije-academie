import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  courseProductSalesforceFieldsForPull,
  SF_COURSE_PRODUCT_OBJECT,
} from "../../../modules/salesforce-sync/mappings/course-product"
import type { SfProductgroupShape } from "../../../modules/salesforce-sync/mappings/productgroup"
import {
  productgroupSalesforceFieldsForPull,
  SF_PRODUCTGROUP_OBJECT,
} from "../../../modules/salesforce-sync/mappings/productgroup"
import { linkedOnlineProductgroupId } from "../../../modules/salesforce-sync/utils/linked-online-productgroup"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

export type FetchLinkedOnlineChildrenInput = {
  groupRecord: Record<string, unknown>
}

export type FetchLinkedOnlineChildrenResult = {
  linkedGroupRecord: Record<string, unknown> | null
  linkedChildRecords: Record<string, unknown>[]
}

export const fetchLinkedOnlineChildrenSalesforceStep = createStep(
  { name: "fetch-linked-online-children-salesforce", maxRetries: 5, retryInterval: 30 },
  async (input: FetchLinkedOnlineChildrenInput, { container }) => {
    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >
    const group = input.groupRecord as SfProductgroupShape
    const linkedId = linkedOnlineProductgroupId(group)

    if (!linkedId) {
      return new StepResponse<FetchLinkedOnlineChildrenResult>({
        linkedGroupRecord: null,
        linkedChildRecords: [],
      })
    }

    const groupFields = productgroupSalesforceFieldsForPull.join(",")
    const groupSoql = `SELECT ${groupFields} FROM ${SF_PRODUCTGROUP_OBJECT} WHERE Id = '${linkedId.replace(/'/g, "\\'")}' LIMIT 1`
    const groupResult = await sync.query<Record<string, unknown>>(groupSoql)
    const linkedGroupRecord = groupResult.records[0] ?? null

    const childFields = courseProductSalesforceFieldsForPull.join(",")
    const childSoql = `SELECT ${childFields} FROM ${SF_COURSE_PRODUCT_OBJECT} WHERE Productgroup__c = '${linkedId.replace(/'/g, "\\'")}' ORDER BY Start_date_time__c ASC`
    const childResult = await sync.query<Record<string, unknown>>(childSoql)

    return new StepResponse<FetchLinkedOnlineChildrenResult>({
      linkedGroupRecord,
      linkedChildRecords: childResult.records ?? [],
    })
  }
)
