import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  courseProductSalesforceFieldsForPull,
  SF_COURSE_PRODUCT_OBJECT,
} from "../modules/salesforce-sync/mappings/course-product"
import {
  productgroupSalesforceFieldsForPull,
  SF_PRODUCTGROUP_OBJECT,
} from "../modules/salesforce-sync/mappings/productgroup"
import { importProductgroupFromSalesforce } from "../modules/salesforce-sync/import-productgroup"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

const SF_ID = "a05Mz00000UnoYfIAJ"

export default async function ({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  const fields = productgroupSalesforceFieldsForPull.join(",")
  const groupQ = await sync.query<Record<string, unknown>>(
    `SELECT ${fields} FROM ${SF_PRODUCTGROUP_OBJECT} WHERE Id = '${SF_ID}' LIMIT 1`
  )
  const childFields = courseProductSalesforceFieldsForPull.join(",")
  const directQ = await sync.query<Record<string, unknown>>(
    `SELECT ${childFields} FROM ${SF_COURSE_PRODUCT_OBJECT} WHERE Productgroup__c = '${SF_ID}'`
  )

  const result = await importProductgroupFromSalesforce(container, {
    salesforceId: SF_ID,
    groupRecord: groupQ.records[0]!,
    childRecords: directQ.records,
    linkedGroupRecord: null,
    linkedChildRecords: [],
    manual: true,
  })
  logger.info(`[debug-slave] result=${JSON.stringify(result)}`)
}
