import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { writeFileSync } from "node:fs"

import { sfRequest } from "../modules/salesforce-sync/client/rest"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

const PROFILE_HINT =
  /bio|teaser|description|photo|image|picture|subject|expert|profile|website|linkedin|email|phone|title|role|docent|teacher|speaker|visible|functie|omschrijving/i

function pickProfileFields(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (key === "attributes") continue
    if (value == null || value === "") continue
    if (PROFILE_HINT.test(key)) out[key] = value
  }
  return out
}

export default async function inspectSfTeacherAccount({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  const id = arg("--id")?.trim() ?? "0011t00000K06XoAAJ"
  const outPath = arg("--out")?.trim()

  if (!(await sync.isIntegrationReady())) {
    logger.error("[inspect-sf-teacher] Salesforce not configured")
    return
  }

  const escaped = id.replace(/'/g, "\\'")
  let record: Record<string, unknown> | null = null
  let objectType: string | null = null

  for (const object of ["Account", "Contact"]) {
    try {
      const soql = `SELECT FIELDS(ALL) FROM ${object} WHERE Id = '${escaped}' LIMIT 1`
      const result = await sync.query<Record<string, unknown>>(soql)
      if (result.records[0]) {
        record = result.records[0]
        objectType = object
        break
      }
    } catch (err) {
      logger.warn(`[inspect-sf-teacher] ${object} FIELDS(ALL) failed: ${(err as Error).message}`)
    }
  }

  if (!record) {
    for (const soql of [
      `SELECT Id, Name FROM Account WHERE Id = '${escaped}' LIMIT 1`,
      `SELECT Id, Name FROM Contact WHERE Id = '${escaped}' LIMIT 1`,
    ]) {
      try {
        const minimal = await sync.query<Record<string, unknown>>(soql)
        if (minimal.records[0]) {
          record = minimal.records[0]
          objectType = soql.includes("Account") ? "Account" : "Contact"
          break
        }
      } catch {
        /* no access */
      }
    }
  }

  let describeHints: unknown = null
  const describeObject = objectType ?? "Account"
  if (describeObject) {
    const { data } = await sfRequest<Record<string, unknown>>(
      "GET",
      `/sobjects/${describeObject}/describe`
    )
    const allFields = data.fields as { name: string; label: string; type: string }[] | undefined
    describeHints = allFields
      ?.filter((f) => PROFILE_HINT.test(f.name) || f.name.endsWith("__c"))
      .filter((f) => PROFILE_HINT.test(f.name) || /docent|teacher|bio|photo|profile|expert|website|visible/i.test(f.name))
      .map((f) => ({ name: f.name, label: f.label, type: f.type }))
  }

  const payload: Record<string, unknown> = {
    queried_at: new Date().toISOString(),
    salesforce_id: id,
    object_type: objectType,
    profile_fields: record ? pickProfileFields(record) : null,
    name: (record?.Name as string | undefined) ?? null,
    record: record ?? null,
    describe_profile_fields: describeHints,
  }

  if (!record && describeObject === "Account") {
    const fields = [
      "Id",
      "Name",
      "Description",
      "PhotoUrl",
      "Website",
      "PersonEmail",
      "PersonTitle",
      "Email__c",
      "Visible_on_website__c",
    ]
    try {
      const probe = await sync.query<Record<string, unknown>>(
        `SELECT ${fields.join(", ")} FROM Account WHERE Id = '${escaped}' LIMIT 1`
      )
      payload.record_probe = probe.records[0] ?? null
      if (probe.records[0]) {
        payload.profile_fields = pickProfileFields(probe.records[0])
        payload.name = (probe.records[0].Name as string) ?? null
      }
    } catch (err) {
      payload.record_probe_error = (err as Error).message
    }
  }

  const json = JSON.stringify(payload, null, 2)
  if (outPath) writeFileSync(outPath, json, "utf8")
  logger.info(json.length > 20_000 ? `${json.slice(0, 20_000)}…` : json)
}
