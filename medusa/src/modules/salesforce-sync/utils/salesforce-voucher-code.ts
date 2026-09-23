const GTC_PREFIX = /^GTC-/

/** Customer-facing cadeaubon code from Salesforce Voucher__c (Name / Code__c). */
export function customerFacingCodeFromVoucher(record: {
  Code__c?: string | null
  Name?: string | null
}): string | null {
  const codeField =
    typeof record.Code__c === "string" ? record.Code__c.trim().toUpperCase() : ""
  const nameField = typeof record.Name === "string" ? record.Name.trim().toUpperCase() : ""
  if (GTC_PREFIX.test(codeField)) return codeField
  if (GTC_PREFIX.test(nameField)) return nameField
  return null
}
