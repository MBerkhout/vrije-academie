/**
 * Re-sync Reservations__r onto existing event items (one product group at a time).
 *
 *   npm run salesforce:import-one -- --url=colleges-10-internationale-topmusea
 * Or bulk productgroup import (includes reservations after deploy).
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  courseProductSalesforceSelectClause,
  SF_COURSE_PRODUCT_OBJECT,
} from "../modules/salesforce-sync/mappings/course-product"
import { importProductgroupFromSalesforce } from "../modules/salesforce-sync/import-productgroup"
import {
  productgroupSalesforceFieldsForPull,
  SF_PRODUCTGROUP_OBJECT,
} from "../modules/salesforce-sync/mappings/productgroup"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function backfillEventItemDates({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  if (!(await sync.isIntegrationReady())) {
    logger.error("[backfill-event-item-dates] Salesforce not configured")
    return
  }

  const url = arg("--url")?.trim()
  const salesforceId = arg("--salesforce-id")?.trim()
  if (!url && !salesforceId) {
    logger.info("Usage: --url=<Productgroup_URL__c> | --salesforce-id=<Id>")
    return
  }

  const groupFields = productgroupSalesforceFieldsForPull.join(",")
  const groupSoql = url
    ? `SELECT ${groupFields} FROM ${SF_PRODUCTGROUP_OBJECT} WHERE Productgroup_URL__c = '${url.replace(/'/g, "\\'")}' LIMIT 1`
  : `SELECT ${groupFields} FROM ${SF_PRODUCTGROUP_OBJECT} WHERE Id = '${salesforceId!.replace(/'/g, "\\'")}' LIMIT 1`

  const groupResult = await sync.query<Record<string, unknown>>(groupSoql)
  const groupRecord = groupResult.records[0]
  const groupId = String(groupRecord?.Id ?? "")
  if (!groupRecord || !groupId) {
    logger.error("[backfill-event-item-dates] Product group not found")
    return
  }

  const childFields = courseProductSalesforceSelectClause()
  const childSoql = `SELECT ${childFields} FROM ${SF_COURSE_PRODUCT_OBJECT} WHERE Productgroup__c = '${groupId.replace(/'/g, "\\'")}' ORDER BY Start_date_time__c ASC`
  const childResult = await sync.query<Record<string, unknown>>(childSoql)

  const result = await importProductgroupFromSalesforce(container, {
    salesforceId: groupId,
    groupRecord,
    childRecords: childResult.records ?? [],
    manual: true,
  })

  logger.info(
    JSON.stringify({
      tag: "backfill-event-item-dates",
      medusaId: result.medusaId,
      updated: result.updated,
      variantIds: result.variantIds.length,
    })
  )
}