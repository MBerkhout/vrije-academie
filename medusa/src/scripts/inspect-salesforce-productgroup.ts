/**
 * Read-only Salesforce dump for a product group and its child products.
 *
 *   npm run salesforce:inspect -- --url=art-nouveau
 *   npm run salesforce:inspect -- --salesforce-id=a05...
 *   npm run salesforce:inspect -- --url=art-nouveau --out=./tmp/art-nouveau.json
 *   npm run salesforce:inspect -- --url=art-nouveau --describe
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"

import { sfRequest } from "../modules/salesforce-sync/client/rest"
import { SF_COURSE_PRODUCT_OBJECT } from "../modules/salesforce-sync/mappings/course-product"
import { SF_PRODUCTGROUP_OBJECT } from "../modules/salesforce-sync/mappings/productgroup"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { salesforceAuthMode } from "../modules/salesforce-sync/utils/is-configured"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

function escapeSoql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

const DOCENT_FIELD_HINT = /docent|speaker|instructor|lecturer|teacher/i
const EMBED_FIELD_HINT = /embed|iframe|player|preview|audience/i

function highlightFields(
  record: Record<string, unknown>,
  hint: RegExp
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (key === "attributes") continue
    if (hint.test(key) && value != null && value !== "") {
      out[key] = value
    }
  }
  return out
}

export default async function inspectSalesforceProductgroup({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  if (!(await sync.isIntegrationReady())) {
    logger.error(
      "[salesforce:inspect] Not configured. See docs/SALESFORCE_SYNC.md for JWT or OAuth setup."
    )
    return
  }

  const url = arg("--url")?.trim()
  const salesforceId = arg("--salesforce-id")?.trim()
  const outPath = arg("--out")?.trim()
  const includeDescribe = process.argv.includes("--describe")

  if (!url && !salesforceId) {
    logger.info(
      "[salesforce:inspect] Usage: --url=<Productgroup_URL__c> | --salesforce-id=<vaProductgroup__c Id> [--out=path.json] [--describe]"
    )
    return
  }

  logger.info(`[salesforce:inspect] auth mode: ${salesforceAuthMode()}`)

  let groupId = salesforceId ?? ""
  let groupRecord: Record<string, unknown> | null = null

  if (url) {
    const soql = `SELECT FIELDS(ALL) FROM ${SF_PRODUCTGROUP_OBJECT} WHERE Productgroup_URL__c = '${escapeSoql(url)}' LIMIT 1`
    const result = await sync.query<Record<string, unknown>>(soql)
    groupRecord = result.records[0] ?? null
    groupId = String(groupRecord?.Id ?? "")
  } else if (salesforceId) {
    const soql = `SELECT FIELDS(ALL) FROM ${SF_PRODUCTGROUP_OBJECT} WHERE Id = '${escapeSoql(salesforceId)}' LIMIT 1`
    const result = await sync.query<Record<string, unknown>>(soql)
    groupRecord = result.records[0] ?? null
    groupId = salesforceId
  }

  if (!groupRecord || !groupId) {
    logger.error(`[salesforce:inspect] No ${SF_PRODUCTGROUP_OBJECT} found for ${url ?? salesforceId}`)
    return
  }

  const childSoql = `SELECT FIELDS(ALL) FROM ${SF_COURSE_PRODUCT_OBJECT} WHERE Productgroup__c = '${escapeSoql(groupId)}' ORDER BY Start_date_time__c ASC LIMIT 200`
  const childResult = await sync.query<Record<string, unknown>>(childSoql)

  let describe: Record<string, unknown> | null = null
  if (includeDescribe) {
    const { data } = await sfRequest<Record<string, unknown>>(
      "GET",
      `/sobjects/${SF_PRODUCTGROUP_OBJECT}/describe`
    )
    describe = {
      productgroup_fields: (data.fields as { name: string; label: string; type: string }[] | undefined)
        ?.filter((f) => DOCENT_FIELD_HINT.test(f.name) || EMBED_FIELD_HINT.test(f.name))
        .map((f) => ({ name: f.name, label: f.label, type: f.type })),
      course_product_fields: undefined as unknown,
    }
    const { data: childDescribe } = await sfRequest<Record<string, unknown>>(
      "GET",
      `/sobjects/${SF_COURSE_PRODUCT_OBJECT}/describe`
    )
    describe.course_product_fields = (
      childDescribe.fields as { name: string; label: string; type: string }[] | undefined
    )
      ?.filter((f) => DOCENT_FIELD_HINT.test(f.name) || EMBED_FIELD_HINT.test(f.name))
      .map((f) => ({ name: f.name, label: f.label, type: f.type }))
  }

  const payload = {
    queried_at: new Date().toISOString(),
    productgroup: groupRecord,
    children: childResult.records,
    hints: {
      docent_fields_on_group: highlightFields(groupRecord, DOCENT_FIELD_HINT),
      embed_fields_on_group: highlightFields(groupRecord, EMBED_FIELD_HINT),
      docent_fields_on_children: childResult.records.map((child, i) => ({
        index: i,
        id: child.Id,
        ...highlightFields(child, DOCENT_FIELD_HINT),
      })),
      embed_fields_on_children: childResult.records.map((child, i) => ({
        index: i,
        id: child.Id,
        ...highlightFields(child, EMBED_FIELD_HINT),
      })),
    },
    describe,
  }

  const json = JSON.stringify(payload, null, 2)

  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, json, "utf8")
    logger.info(`[salesforce:inspect] Wrote ${outPath}`)
  }

  const maxLen = 24_000
  logger.info(json.length > maxLen ? `${json.slice(0, maxLen)}… (truncated, use --out=)` : json)
}
