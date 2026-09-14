import { getSalesforceAccessToken } from "../client/auth"
import { createMetadata, updateMetadata } from "../client/metadata-soap"
import {
  customFieldMetadataXml,
  customLabelMetadataXml,
  isAlreadyExistsResult,
  permissionSetMetadataXml,
  type MetadataSaveResult,
} from "../client/metadata-xml"
import { sfRequest } from "../client/rest"
import {
  MEDUSA_ADMIN_BASE_URL_LABEL,
  MEDUSA_SYNC_PERMISSION_SET,
  chunkMetadata,
  dataFields,
  formulaFields,
  fullFieldName,
  medusaCustomFieldSpecs,
  normalizeMedusaAdminUrl,
  type MedusaSfFieldSpec,
} from "./medusa-custom-fields-spec"

export type EnsureMedusaFieldsLogger = {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

export type EnsureMedusaFieldsInput = {
  adminUrl: string
  dryRun?: boolean
  skipPermissionSet?: boolean
  logger: EnsureMedusaFieldsLogger
}

export type EnsureMedusaFieldsReport = {
  created: string[]
  existed: string[]
  updated: string[]
  failed: Array<{ name: string; error: string }>
}

type DescribeResponse = { fields?: Array<{ name: string }> }

function applyResults(
  report: EnsureMedusaFieldsReport,
  results: MetadataSaveResult[],
  successKey: "created" | "updated"
): void {
  for (const result of results) {
    const name = result.fullName || "(unknown)"
    if (result.success) {
      report[successKey].push(name)
      continue
    }
    if (isAlreadyExistsResult(result)) {
      report.existed.push(name)
      continue
    }
    const error = result.errors.map((e) => e.message).filter(Boolean).join("; ") || "unknown error"
    report.failed.push({ name, error })
  }
}

async function createOrUpdate(
  report: EnsureMedusaFieldsReport,
  itemsXml: string[],
  exists: boolean
): Promise<void> {
  if (exists) {
    applyResults(report, await updateMetadata(itemsXml), "updated")
    return
  }
  const created = await createMetadata(itemsXml)
  applyResults(report, created, "created")
  const duplicates = created.filter((r) => !r.success && isAlreadyExistsResult(r))
  if (duplicates.length === itemsXml.length) {
    report.existed = report.existed.filter((n) => !duplicates.some((d) => d.fullName === n))
    applyResults(report, await updateMetadata(itemsXml), "updated")
  }
}

async function describeFieldNames(objectApiName: string): Promise<Set<string> | null> {
  try {
    const { data } = await sfRequest<DescribeResponse>(
      "GET",
      `/sobjects/${encodeURIComponent(objectApiName)}/describe`
    )
    return new Set((data.fields ?? []).map((f) => f.name))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/NOT_FOUND|NOT FOUND|resource does not exist/i.test(message)) return null
    throw err
  }
}

async function orgLanguage(): Promise<string> {
  try {
    const { data } = await sfRequest<{ records?: Array<{ LanguageLocaleKey?: string }> }>(
      "GET",
      `/query?q=${encodeURIComponent("SELECT LanguageLocaleKey FROM Organization LIMIT 1")}`
    )
    return data.records?.[0]?.LanguageLocaleKey?.trim() || "en_US"
  } catch {
    return "en_US"
  }
}

async function customLabelState(): Promise<{ exists: boolean; language: string | null }> {
  try {
    const { data } = await sfRequest<{
      records?: Array<{ Language?: string }>
      totalSize?: number
    }>(
      "GET",
      `/tooling/query?q=${encodeURIComponent(
        `SELECT Id, Language FROM ExternalString WHERE Name = '${MEDUSA_ADMIN_BASE_URL_LABEL}' LIMIT 1`
      )}`
    )
    const row = data.records?.[0]
    return { exists: (data.totalSize ?? 0) > 0, language: row?.Language?.trim() || null }
  } catch {
    return { exists: false, language: null }
  }
}

async function runningUserId(): Promise<string | null> {
  const { access_token, instance_url } = await getSalesforceAccessToken()
  const res = await fetch(`${instance_url.replace(/\/$/, "")}/services/oauth2/userinfo`, {
    headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json" },
  })
  if (!res.ok) return null
  const json = (await res.json()) as { user_id?: string }
  return json.user_id?.trim() || null
}

async function permissionSetId(): Promise<string | null> {
  const { data } = await sfRequest<{ records?: Array<{ Id?: string }> }>(
    "GET",
    `/query?q=${encodeURIComponent(
      `SELECT Id FROM PermissionSet WHERE Name = '${MEDUSA_SYNC_PERMISSION_SET}' LIMIT 1`
    )}`
  )
  return data.records?.[0]?.Id?.trim() || null
}

async function assignPermissionSet(
  logger: EnsureMedusaFieldsLogger,
  report: EnsureMedusaFieldsReport
): Promise<void> {
  const [setId, userId] = await Promise.all([permissionSetId(), runningUserId()])
  if (!setId) {
    report.failed.push({
      name: `PermissionSet.${MEDUSA_SYNC_PERMISSION_SET}`,
      error: "Permission set missing after create/update",
    })
    return
  }
  if (!userId) {
    logger.warn(
      `[salesforce-fields] Could not resolve running user id — assign permission set ${MEDUSA_SYNC_PERMISSION_SET} manually`
    )
    return
  }

  try {
    await sfRequest("POST", "/sobjects/PermissionSetAssignment", {
      body: { PermissionSetId: setId, AssigneeId: userId },
    })
    report.created.push(`PermissionSetAssignment:${userId}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/DUPLICATE/i.test(message)) {
      report.existed.push(`PermissionSetAssignment:${userId}`)
      return
    }
    report.failed.push({ name: `PermissionSetAssignment:${userId}`, error: message })
  }
}

export async function ensureMedusaCustomFields(
  input: EnsureMedusaFieldsInput
): Promise<EnsureMedusaFieldsReport> {
  const adminUrl = normalizeMedusaAdminUrl(input.adminUrl)
  const logger = input.logger
  const report: EnsureMedusaFieldsReport = { created: [], existed: [], updated: [], failed: [] }
  const specs = medusaCustomFieldSpecs()

  const objectNames = [...new Set(specs.map((s) => s.objectApiName))]
  const presentByObject = new Map<string, Set<string> | null>()
  for (const objectApiName of objectNames) {
    if (input.dryRun) {
      presentByObject.set(objectApiName, new Set())
      continue
    }
    const names = await describeFieldNames(objectApiName)
    presentByObject.set(objectApiName, names)
    if (names === null) {
      logger.warn(`[salesforce-fields] Object ${objectApiName} not found — skipping its fields`)
    }
  }

  const usable = (field: MedusaSfFieldSpec): boolean => {
    const names = presentByObject.get(field.objectApiName)
    if (names === null) {
      report.failed.push({
        name: fullFieldName(field),
        error: `Salesforce object ${field.objectApiName} not found`,
      })
      return false
    }
    return true
  }

  const missing = (field: MedusaSfFieldSpec): boolean => {
    const names = presentByObject.get(field.objectApiName)
    if (!names) return true
    return !names.has(field.fieldApiName)
  }

  const toCreateData = dataFields(specs).filter(usable).filter(missing)
  const toCreateFormula = formulaFields(specs).filter(usable).filter(missing)
  const alreadyThere = specs.filter(usable).filter((f) => !missing(f)).map(fullFieldName)

  logger.info(`[salesforce-fields] Admin URL: ${adminUrl}`)
  logger.info(`[salesforce-fields] Custom Label: ${MEDUSA_ADMIN_BASE_URL_LABEL}`)
  logger.info(`[salesforce-fields] Data fields to create: ${toCreateData.map(fullFieldName).join(", ") || "(none)"}`)
  logger.info(
    `[salesforce-fields] Formula fields to create: ${toCreateFormula.map(fullFieldName).join(", ") || "(none)"}`
  )
  if (alreadyThere.length) {
    logger.info(`[salesforce-fields] Already present: ${alreadyThere.join(", ")}`)
    report.existed.push(...alreadyThere)
  }

  if (input.dryRun) {
    logger.info("[salesforce-fields] Dry run — no Metadata API writes")
    return report
  }

  const [language, labelState] = await Promise.all([orgLanguage(), customLabelState()])
  const labelXml = customLabelMetadataXml({
    language: labelState.language || language,
    value: adminUrl,
  })
  await createOrUpdate(report, [labelXml], labelState.exists)

  for (const chunk of chunkMetadata(toCreateData)) {
    applyResults(report, await createMetadata(chunk.map(customFieldMetadataXml)), "created")
  }
  for (const chunk of chunkMetadata(toCreateFormula)) {
    applyResults(report, await createMetadata(chunk.map(customFieldMetadataXml)), "created")
  }

  if (!input.skipPermissionSet) {
    const permXml = permissionSetMetadataXml(specs.filter(usable))
    await createOrUpdate(report, [permXml], !!(await permissionSetId()))
    await assignPermissionSet(logger, report)
  }

  return report
}
