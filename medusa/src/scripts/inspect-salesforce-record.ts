/**
 * Look up Salesforce object type and sample fields for a record Id.
 *   npx medusa exec ./src/scripts/inspect-salesforce-record.ts -- --id=a019X00002APRcjQAH
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { sfRequest } from "../modules/salesforce-sync/client/rest"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { salesforceAuthMode } from "../modules/salesforce-sync/utils/is-configured"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

function escapeSoql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

export default async function inspectSalesforceRecord({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const id = arg("--id")?.trim()
  if (!id) {
    logger.info("Usage: --id=<Salesforce record Id>")
    return
  }

  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  const ready = await sync.isIntegrationReady()
  if (!ready) {
    logger.error("[inspect-sf-record] Salesforce not configured (check OAuth connect or env credentials)")
    return
  }

  const prefix = id.slice(0, 3)
  const entityResult = await sync.query<{
    QualifiedApiName: string
    Label: string
    KeyPrefix: string
  }>(
    `SELECT QualifiedApiName, Label, KeyPrefix FROM EntityDefinition WHERE KeyPrefix = '${escapeSoql(prefix)}' LIMIT 5`
  )

  logger.info(`Key prefix ${prefix}:`)
  for (const row of entityResult.records) {
    logger.info(`  ${row.QualifiedApiName} (${row.Label})`)
  }

  const objectType =
    entityResult.records.find((r) => r.QualifiedApiName.endsWith("__c"))?.QualifiedApiName ??
    entityResult.records[0]?.QualifiedApiName

  if (!objectType) {
    logger.error("Could not resolve object type from EntityDefinition")
    return
  }

  logger.info(`Trying retrieve on ${objectType} / ${id}`)

  try {
    const record = await sync.retrieve(objectType, id, ["Id", "Name", "Status__c"])
    logger.info(JSON.stringify({ objectType, record }, null, 2))
  } catch (err) {
    logger.error(`Retrieve failed: ${err instanceof Error ? err.message : String(err)}`)
    const { data } = await sfRequest<{ fields?: Array<{ name: string; label: string; type: string }> }>(
      "GET",
      `/sobjects/${objectType}/describe`
    )
    const statusField = data.fields?.find((f) => f.name === "Status__c")
    if (statusField) {
      logger.info(`Status__c picklist: ${JSON.stringify(statusField, null, 2)}`)
    }
  }
}
