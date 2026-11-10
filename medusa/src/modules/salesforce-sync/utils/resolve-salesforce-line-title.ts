export const SF_LINE_GENERIC_TITLE = "Cursus"
export const REGISTRATION_CANCELLED = "Geannuleerd"

export type SfLineTitleInput = {
  ProductName__c?: string
  vaProduct__r?: {
    Name?: string | null
    ProductGroup__r?: { Name?: string | null } | null
  } | null
  Product2?: { Name?: string | null } | null
}

export function resolveLineTitle(row: SfLineTitleInput): string {
  const candidates = [
    row.ProductName__c,
    row.vaProduct__r?.Name,
    row.vaProduct__r?.ProductGroup__r?.Name,
    row.Product2?.Name,
  ]
  for (const c of candidates) {
    const s = typeof c === "string" ? c.trim() : ""
    if (s) return s
  }
  return SF_LINE_GENERIC_TITLE
}
