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
import { linkedOnlineProductgroupId } from "../modules/salesforce-sync/utils/linked-online-productgroup"
import type { SfProductgroupShape } from "../modules/salesforce-sync/mappings/productgroup"
import { importProductgroupFromSalesforce } from "../modules/salesforce-sync/import-productgroup"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

const SF_ID = "a051t0000038EsOAAU"

export default async function ({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  const fields = productgroupSalesforceFieldsForPull.join(",")
  const groupQ = await sync.query<Record<string, unknown>>(
    `SELECT ${fields} FROM ${SF_PRODUCTGROUP_OBJECT} WHERE Id = '${SF_ID}' LIMIT 1`
  )
  const groupRecord = groupQ.records[0]!
  const group = groupRecord as SfProductgroupShape
  const linkedId = linkedOnlineProductgroupId(group)
  logger.info(`[debug] linkedId=${linkedId}`)

  const childFields = courseProductSalesforceFieldsForPull.join(",")
  const directQ = await sync.query<Record<string, unknown>>(
    `SELECT ${childFields} FROM ${SF_COURSE_PRODUCT_OBJECT} WHERE Productgroup__c = '${SF_ID}'`
  )
  let linkedGroupRecord: Record<string, unknown> | null = null
  let linkedChildRecords: Record<string, unknown>[] = []
  if (linkedId) {
    const lgQ = await sync.query<Record<string, unknown>>(
      `SELECT ${fields} FROM ${SF_PRODUCTGROUP_OBJECT} WHERE Id = '${linkedId}' LIMIT 1`
    )
    linkedGroupRecord = lgQ.records[0] ?? null
    const lcQ = await sync.query<Record<string, unknown>>(
      `SELECT ${childFields} FROM ${SF_COURSE_PRODUCT_OBJECT} WHERE Productgroup__c = '${linkedId}'`
    )
    linkedChildRecords = lcQ.records
    logger.info(`[debug] linked children=${linkedChildRecords.length}`)
  }

  const result = await importProductgroupFromSalesforce(container, {
    salesforceId: SF_ID,
    groupRecord,
    childRecords: directQ.records,
    linkedGroupRecord,
    linkedChildRecords,
    manual: true,
  })
  logger.info(`[debug] result=${JSON.stringify(result)}`)
}
