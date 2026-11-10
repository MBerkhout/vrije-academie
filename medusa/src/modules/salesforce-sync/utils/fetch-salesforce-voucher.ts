import type SalesforceSyncModuleService from "../service"
import { SF_VOUCHER_OBJECT } from "./salesforce-config"
import { majorEurToCents } from "./money"
import {
  filterSObjectFieldsByPattern,
  loadSObjectFieldDescribe,
  soqlFieldList,
} from "./salesforce-describe-fields"

export type SalesforceVoucherRecord = {
  Id: string
  Name?: string | null
  Code__c?: string | null
  Type__c?: string | null
  Original_Amount__c?: number | null
  Remaining_Amount__c?: number | null
  Status__c?: string | null
  Beneficiary_Name__c?: string | null
  Beneficiary_Email__c?: string | null
  Expiration_Date__c?: string | null
  Valid_Until__c?: string | null
  Einddatum__c?: string | null
  End_Date__c?: string | null
  Amount__c?: number | null
  Is_Expired__c?: boolean | null
  [key: string]: unknown
}

const BASE_SELECT =
  "Id, Name, Code__c, Type__c, Original_Amount__c, Beneficiary_Name__c, Beneficiary_Email__c"

/** Candidate API names — filtered via describe before SOQL (org may differ). */
export const VOUCHER_EXPIRED_FLAG_FIELDS = ["Is_Expired__c", "IsExpired__c"] as const

export const VOUCHER_EXPIRY_DATE_FIELDS = [
  "Expiration_Date__c",
  "Valid_Until__c",
  "Einddatum__c",
  "End_Date__c",
] as const

/** Remaining balance field names (major EUR); tried in order by {@link salesforceVoucherBalanceCents}. */
const DEFAULT_REMAINING_FIELDS = [
  "Remaining_Amount__c",
  "Remaining_Balance__c",
  "Available_Amount__c",
  "Balance__c",
  "Restbedrag__c",
  "Remaining_Value__c",
  "Amount__c",
]

function escapeSoql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

function codeCandidates(normalized: string): string[] {
  const withoutGift = normalized.replace(/^GIFT-/i, "")
  const withoutGtc = normalized.replace(/^GTC-/i, "")
  return [...new Set([normalized, withoutGift, withoutGtc].filter(Boolean))]
}

function numericSuffix(normalized: string): string | null {
  const match = normalized.match(/(\d{5,})$/)
  return match?.[1] ?? null
}

function isInvalidFieldError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /INVALID_FIELD/i.test(msg)
}

async function queryVoucher(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  select: string,
  normalized: string
): Promise<SalesforceVoucherRecord | null> {
  for (const candidate of codeCandidates(normalized)) {
    const escaped = escapeSoql(candidate)
    const soql = `SELECT ${select} FROM ${SF_VOUCHER_OBJECT} WHERE Code__c = '${escaped}' OR Name = '${escaped}' LIMIT 1`
    try {
      const q = await sync.query<SalesforceVoucherRecord>(soql)
      if (q.records[0]) return q.records[0]
    } catch (err) {
      if (isInvalidFieldError(err)) throw err
      throw err
    }
  }

  const suffix = numericSuffix(normalized)
  if (suffix) {
    const escapedSuffix = escapeSoql(suffix)
    const likeSoql = `SELECT ${select} FROM ${SF_VOUCHER_OBJECT} WHERE Name LIKE '%${escapedSuffix}' OR Code__c LIKE '%${escapedSuffix}' ORDER BY CreatedDate DESC LIMIT 3`
    try {
      const q = await sync.query<SalesforceVoucherRecord>(likeSoql)
      const upper = normalized.toUpperCase()
      const exact = q.records.find((row) => {
        const name = typeof row.Name === "string" ? row.Name.trim().toUpperCase() : ""
        const code = typeof row.Code__c === "string" ? row.Code__c.trim().toUpperCase() : ""
        return name === upper || code === upper || name.endsWith(suffix) || code.endsWith(suffix)
      })
      return exact ?? q.records[0] ?? null
    } catch (err) {
      if (isInvalidFieldError(err)) throw err
      throw err
    }
  }

  return null
}

export function voucherQueryFieldCandidates(): string[] {
  const extra = process.env.SALESFORCE_VOUCHER_EXTRA_FIELDS?.trim()
  const remainingField =
    process.env.SALESFORCE_VOUCHER_REMAINING_FIELD?.trim() || "Remaining_Amount__c"
  const statusField = process.env.SALESFORCE_VOUCHER_STATUS_FIELD?.trim() || "Status__c"
  const expiryOverride = process.env.SALESFORCE_VOUCHER_EXPIRY_FIELD?.trim()
  const expiryFields = expiryOverride
    ? expiryOverride
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [...VOUCHER_EXPIRY_DATE_FIELDS]

  return [
    ...BASE_SELECT.split(",").map((s) => s.trim()),
    remainingField,
    ...DEFAULT_REMAINING_FIELDS,
    statusField,
    ...VOUCHER_EXPIRED_FLAG_FIELDS,
    ...expiryFields,
    ...(extra
      ? extra
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []),
  ]
}

/** SOQL SELECT list with only fields that exist on Voucher__c in this org. */
export async function buildVoucherSoqlSelect(
  _sync: InstanceType<typeof SalesforceSyncModuleService>
): Promise<string> {
  const candidates = [...voucherQueryFieldCandidates()]
  const describe = await loadSObjectFieldDescribe(SF_VOUCHER_OBJECT)
  if (describe) {
    const expiredFlags = filterSObjectFieldsByPattern(describe, /is\s*expired|verlopen/i).map(
      (f) => f.name
    )
    const expiryDates = filterSObjectFieldsByPattern(
      describe,
      /einddatum|expiration\s*date|valid\s*until|vervaldatum/i
    )
      .filter((f) => !f.type || /date/i.test(f.type))
      .map((f) => f.name)
    const balances = filterSObjectFieldsByPattern(describe, /^bedrag$|remaining|restbedrag/i)
      .filter((f) => f.type === "currency" || f.type === "double")
      .map((f) => f.name)
    candidates.push(...expiredFlags, ...expiryDates, ...balances)
  }
  const unique = [...new Set(candidates)]
  const select = await soqlFieldList(SF_VOUCHER_OBJECT, unique)
  return select.trim() || BASE_SELECT
}

/** Load a Voucher__c row by customer code (Code__c or Name). */
export async function fetchSalesforceVoucherByCode(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  normalizedCode: string
): Promise<SalesforceVoucherRecord | null> {
  const select = await buildVoucherSoqlSelect(sync)

  try {
    return await queryVoucher(sync, select, normalizedCode)
  } catch (err) {
    if (!isInvalidFieldError(err)) throw err
    return queryVoucher(sync, BASE_SELECT, normalizedCode)
  }
}

export function salesforceVoucherBalanceCents(voucher: SalesforceVoucherRecord): number {
  const configured = process.env.SALESFORCE_VOUCHER_REMAINING_FIELD?.trim()
  const fieldNames = [
    ...(configured ? [configured] : []),
    ...DEFAULT_REMAINING_FIELDS,
  ]
  for (const field of fieldNames) {
    const remaining = voucher[field as keyof SalesforceVoucherRecord]
    if (typeof remaining === "number" && Number.isFinite(remaining)) {
      return majorEurToCents(remaining)
    }
  }
  if (typeof voucher.Original_Amount__c === "number" && Number.isFinite(voucher.Original_Amount__c)) {
    return majorEurToCents(voucher.Original_Amount__c)
  }
  return 0
}

export function salesforceVoucherInitialCents(voucher: SalesforceVoucherRecord): number {
  if (typeof voucher.Original_Amount__c === "number" && Number.isFinite(voucher.Original_Amount__c)) {
    return majorEurToCents(voucher.Original_Amount__c)
  }
  return salesforceVoucherBalanceCents(voucher)
}

function isTruthySalesforceCheckbox(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === 1
}

export function isSalesforceVoucherMarkedExpired(voucher: SalesforceVoucherRecord): boolean {
  for (const field of VOUCHER_EXPIRED_FLAG_FIELDS) {
    if (isTruthySalesforceCheckbox(voucher[field])) return true
  }
  for (const [key, raw] of Object.entries(voucher)) {
    if (key === "Id" || key === "attributes" || key === "Name") continue
    if (/expired|verlopen/i.test(key) && !/date|until|eind|expiration/i.test(key)) {
      if (isTruthySalesforceCheckbox(raw)) return true
    }
  }
  return false
}

export function mapSalesforceVoucherStatus(voucher: SalesforceVoucherRecord): string {
  if (isSalesforceVoucherMarkedExpired(voucher)) return "expired"

  const statusField =
    process.env.SALESFORCE_VOUCHER_STATUS_FIELD?.trim() || "Status__c"
  const raw = voucher[statusField as keyof SalesforceVoucherRecord] ?? voucher.Status__c
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : ""
  if (!s || s === "active" || s === "open" || s === "actief") return "active"
  if (s.includes("cancel")) return "cancelled"
  if (s.includes("expir")) return "expired"
  if (s.includes("deplet") || s.includes("used") || s === "closed") return "depleted"
  return "active"
}

function readSalesforceDateField(voucher: SalesforceVoucherRecord, field: string): string | null {
  const v = voucher[field]
  if (typeof v === "string" && v.trim()) return v.trim()
  return null
}

export function salesforceVoucherExpiresAt(voucher: SalesforceVoucherRecord): string | null {
  const expiryOverride = process.env.SALESFORCE_VOUCHER_EXPIRY_FIELD?.trim()
  const fields = expiryOverride
    ? expiryOverride
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [...VOUCHER_EXPIRY_DATE_FIELDS]

  for (const field of fields) {
    const value = readSalesforceDateField(voucher, field)
    if (value) return value
  }
  return null
}

export function isSalesforceGiftcardVoucher(voucher: SalesforceVoucherRecord): boolean {
  const type = typeof voucher.Type__c === "string" ? voucher.Type__c.trim().toLowerCase() : ""
  if (!type) return true
  return !type.includes("discount")
}
