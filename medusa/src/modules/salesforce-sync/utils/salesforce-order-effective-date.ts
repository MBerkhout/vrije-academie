/**
 * Map Salesforce Order.EffectiveDate (date-only) to an instant at noon Europe/Amsterdam
 * so Medusa/account UI does not shift the calendar day.
 */
export function salesforceEffectiveDateToGrantInstant(
  effectiveDate: string | null | undefined,
  createdDate?: string | null
): Date {
  const raw = effectiveDate?.trim() || createdDate?.trim() || ""
  const dateOnly = raw.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    // Noon UTC on that calendar day; NL display uses local formatting.
    return new Date(`${dateOnly}T11:00:00.000Z`)
  }
  const fromCreated = createdDate ? new Date(createdDate) : new Date()
  return Number.isFinite(fromCreated.getTime()) ? fromCreated : new Date()
}

export function toSalesforceOrderDateMetadata(date: Date): string {
  return date.toISOString()
}
