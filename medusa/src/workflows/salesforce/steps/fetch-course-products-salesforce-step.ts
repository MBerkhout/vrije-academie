import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  courseProductSalesforceFieldsForPull,
  SF_COURSE_PRODUCT_OBJECT,
} from "../../../modules/salesforce-sync/mappings/course-product"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

export type FetchCourseProductsInput = {
  productgroupSalesforceId: string
}

export const fetchCourseProductsSalesforceStep = createStep(
  { name: "fetch-course-products-salesforce", maxRetries: 5, retryInterval: 30 },
  async (input: FetchCourseProductsInput, { container }) => {
    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >
    const fields = courseProductSalesforceFieldsForPull.join(",")
    const soql = `SELECT ${fields} FROM ${SF_COURSE_PRODUCT_OBJECT} WHERE Productgroup__c = '${input.productgroupSalesforceId.replace(/'/g, "\\'")}' ORDER BY Start_date_time__c ASC`
    const q = await sync.query<Record<string, unknown>>(soql)
    return new StepResponse(q.records)
  }
)
