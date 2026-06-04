/**
 * One-off: resolve Account + room names for vaProduct location lookups.
 *   npx medusa exec ./src/scripts/query-sf-location-refs.ts
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { sfRequest } from "../modules/salesforce-sync/client/rest"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

const ACCOUNT_ID = "0011t00000K0NUTAA3"
const ROOM_ID = "a021t000009YWpLAAW"

export default async function querySfLocationRefs({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  if (!(await sync.isIntegrationReady())) {
    logger.error("Salesforce not configured")
    return
  }

  const { data: describe } = await sfRequest<{ fields: { name: string; label: string; type: string; referenceTo?: string[] }[] }>(
    "GET",
    "/sobjects/vaProduct__c/describe"
  )
  const locationFields = (describe.fields ?? []).filter((f) =>
    /location|room|city|account|zaal|locatie/i.test(f.name)
  )
  logger.info(
    `vaProduct location-related fields: ${JSON.stringify(
      locationFields.map((f) => ({
        name: f.name,
        label: f.label,
        type: f.type,
        referenceTo: f.referenceTo,
      })),
      null,
      2
    )}`
  )

  const roomField = locationFields.find((f) => f.name === "Product_Location_Room__c")
  const roomObject = roomField?.referenceTo?.[0]
  if (roomObject) {
    const roomResult = await sync.query<Record<string, unknown>>(
      `SELECT FIELDS(STANDARD) FROM ${roomObject} WHERE Id = '${ROOM_ID}' LIMIT 1`
    )
    logger.info(`Room (${roomObject}): ${JSON.stringify(roomResult.records[0] ?? null)}`)
  }

  const withName = await sync.query<Record<string, unknown>>(
    `SELECT Id, Name, Product_City__c, Product_Location_Name__c, Product_Location_Room_Name__c, Productgroup__r.Productgroup_URL__c FROM vaProduct__c WHERE Product_Location_Name__c != null LIMIT 5`
  )
  logger.info(
    `Products with Product_Location_Name__c: ${JSON.stringify(withName.records, null, 2)}`
  )

  const soql = `SELECT Id, Name, Product_City__c, Product_Location__c, Product_Location_Name__c, Product_Location_Room__c, Product_Location_Room_Name__c, Account__c FROM vaProduct__c WHERE Productgroup__c = 'a05Mz000000cOfdIAE' LIMIT 1`
  const products = await sync.query<Record<string, unknown>>(soql)
  logger.info(`jaaropleiding-filosofie child: ${JSON.stringify(products.records[0] ?? null, null, 2)}`)
}
