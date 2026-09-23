const GTC_PREFIX = /^GTC-/

/** Customer-facing cadeaubon code from Salesforce Voucher__c (Name / Code__c). */
export function customerFacingCodeFromVoucher(record: {
  Code__c?: string | null
  Name?: string | null
}): string | null {
  return resolveVoucherCustomerCode(record, null)
}

/**
 * Map Salesforce voucher fields to the code the customer typed.
 * Handles GTC Name, Code__c without prefix, and exact search matches.
 */
export function resolveVoucherCustomerCode(
  record: { Code__c?: string | null; Name?: string | null },
  searchedNormalized: string | null
): string | null {
  const codeField =
    typeof record.Code__c === "string" ? record.Code__c.trim().toUpperCase() : ""
  const nameField = typeof record.Name === "string" ? record.Name.trim().toUpperCase() : ""
  const search = searchedNormalized?.trim().toUpperCase() ?? ""

  if (search) {
    if (codeField === search || nameField === search) return search
    const withoutGtc = search.replace(/^GTC-/i, "")
    if (withoutGtc && (codeField === withoutGtc || nameField === withoutGtc)) return search
    if (codeField && search.endsWith(codeField) && codeField.length >= 4) return search
    if (nameField && search.endsWith(nameField) && nameField.length >= 4) return search
  }

  if (GTC_PREFIX.test(codeField)) return codeField
  if (GTC_PREFIX.test(nameField)) return nameField

  return null
}
