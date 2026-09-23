import type SalesforceSyncModuleService from "../service"
import { SF_VOUCHER_OBJECT } from "./salesforce-config"
import { majorEurToCents } from "./money"

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
}

const BASE_SELECT =
  "Id, Name, Code__c, Type__c, Original_Amount__c, Beneficiary_Name__c, Beneficiary_Email__c"

function escapeSoql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

function codeCandidates(normalized: string): string[] {
  const withoutGift = normalized.replace(/^GIFT-/i, "")
  return [...new Set([normalized, withoutGift].filter(Boolean))]
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
  return null
}

/** Load a Voucher__c row by customer code (Code__c or Name). */
export async function fetchSalesforceVoucherByCode(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  normalizedCode: string
): Promise<SalesforceVoucherRecord | null> {
  const extra = process.env.SALESFORCE_VOUCHER_EXTRA_FIELDS?.trim()
  const remainingField =
    process.env.SALESFORCE_VOUCHER_REMAINING_FIELD?.trim() || "Remaining_Amount__c"
  const statusField = process.env.SALESFORCE_VOUCHER_STATUS_FIELD?.trim() || "Status__c"
  const expiryFields =
    process.env.SALESFORCE_VOUCHER_EXPIRY_FIELD?.trim() ||
    "Expiration_Date__c, Valid_Until__c"

  const richSelect = [BASE_SELECT, remainingField, statusField, expiryFields, extra]
    .filter(Boolean)
    .join(", ")

  try {
    return await queryVoucher(sync, richSelect, normalizedCode)
  } catch (err) {
    if (!isInvalidFieldError(err)) throw err
    return queryVoucher(sync, BASE_SELECT, normalizedCode)
  }
}

/** Remaining balance in cents from Salesforce voucher fields (major EUR). */
export function salesforceVoucherBalanceCents(voucher: SalesforceVoucherRecord): number {
  const remainingField =
    process.env.SALESFORCE_VOUCHER_REMAINING_FIELD?.trim() || "Remaining_Amount__c"
  const remaining = voucher[remainingField as keyof SalesforceVoucherRecord]
  if (typeof remaining === "number" && Number.isFinite(remaining)) {
    return majorEurToCents(remaining)
  }
  if (typeof voucher.Remaining_Amount__c === "number" && Number.isFinite(voucher.Remaining_Amount__c)) {
    return majorEurToCents(voucher.Remaining_Amount__c)
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

export function mapSalesforceVoucherStatus(voucher: SalesforceVoucherRecord): string {
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

export function salesforceVoucherExpiresAt(voucher: SalesforceVoucherRecord): string | null {
  const expiryField = process.env.SALESFORCE_VOUCHER_EXPIRY_FIELD?.trim()
  if (expiryField) {
    const v = voucher[expiryField as keyof SalesforceVoucherRecord]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  if (typeof voucher.Expiration_Date__c === "string" && voucher.Expiration_Date__c.trim()) {
    return voucher.Expiration_Date__c.trim()
  }
  if (typeof voucher.Valid_Until__c === "string" && voucher.Valid_Until__c.trim()) {
    return voucher.Valid_Until__c.trim()
  }
  return null
}

export function isSalesforceGiftcardVoucher(voucher: SalesforceVoucherRecord): boolean {
  const type = typeof voucher.Type__c === "string" ? voucher.Type__c.trim().toLowerCase() : ""
  if (!type) return true
  return type === "giftcard" || type === "cadeaubon"
}
