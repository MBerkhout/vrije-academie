/**
 * Re-import a single Salesforce product group by URL slug or SF id.
 *
 *   npx medusa exec ./src/scripts/import-one-productgroup.ts -- --url=rondleiding-paleis-op-de-dam
 *   npx medusa exec ./src/scripts/import-one-productgroup.ts -- --salesforce-id=a051t0000038FIBAA2
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { importProductgroupFromSalesforce } from "../modules/salesforce-sync/import-productgroup"
import {
  courseProductSalesforceFieldsForPull,
  SF_COURSE_PRODUCT_OBJECT,
} from "../modules/salesforce-sync/mappings/course-product"
import {
  productgroupSalesforceFieldsForPull,
  SF_PRODUCTGROUP_OBJECT,
} from "../modules/salesforce-sync/mappings/productgroup"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function importOneProductgroup({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  const url = arg("--url")?.trim()
  const salesforceIdArg = arg("--salesforce-id")?.trim()

  if (!url && !salesforceIdArg) {
    logger.error("[import-one-productgroup] Pass --url=<handle> or --salesforce-id=<Id>")
    return
  }

  let salesforceId = salesforceIdArg ?? ""
  let groupRecord: Record<string, unknown> | null = null

  if (url) {
    const escaped = url.replace(/'/g, "\\'")
    const soql = `SELECT ${productgroupSalesforceFieldsForPull.join(",")} FROM ${SF_PRODUCTGROUP_OBJECT} WHERE Productgroup_URL__c = '${escaped}' LIMIT 1`
    const result = await sync.query<Record<string, unknown>>(soql)
    groupRecord = result.records[0] ?? null
    salesforceId = String(groupRecord?.Id ?? "")
  } else {
    groupRecord = await sync.retrieve(SF_PRODUCTGROUP_OBJECT, salesforceId, [
      ...productgroupSalesforceFieldsForPull,
    ])
  }

  if (!groupRecord?.Id) {
    logger.error("[import-one-productgroup] Product group not found")
    return
  }

  const childFields = courseProductSalesforceFieldsForPull.join(",")
  const childResult = await sync.query<Record<string, unknown>>(
    `SELECT ${childFields} FROM ${SF_COURSE_PRODUCT_OBJECT} WHERE Productgroup__c = '${String(groupRecord.Id).replace(/'/g, "\\'")}'`
  )

  const result = await importProductgroupFromSalesforce(container, {
    salesforceId,
    groupRecord: groupRecord as never,
    childRecords: childResult.records as never,
    manual: true,
  })

  logger.info(`[import-one-productgroup] ${JSON.stringify(result)}`)
}
