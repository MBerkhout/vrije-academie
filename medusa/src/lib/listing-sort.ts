/** Numeric Salesforce catalog order from product metadata; null when unset. */
export function salesforceOrderFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): number | null {
  const raw = metadata?.salesforce_order
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  return null
}

function orderSortKey(order: number | null | undefined): number {
  return order ?? Infinity
}

/** Ascending Salesforce Order__c; nulls last. Optional tie-breakers after order. */
export function compareBySalesforceOrder(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  tieBreak?: (a: Record<string, unknown>, b: Record<string, unknown>) => number
): number {
  const orderDiff =
    orderSortKey(a.salesforce_order as number | null | undefined) -
    orderSortKey(b.salesforce_order as number | null | undefined)
  if (orderDiff !== 0) return orderDiff
  return tieBreak?.(a, b) ?? 0
}

export function tieBreakEventsByStartThenTitle(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): number {
  const aDate = a.earliest_start_at
    ? new Date(a.earliest_start_at as string).getTime()
    : Infinity
  const bDate = b.earliest_start_at
    ? new Date(b.earliest_start_at as string).getTime()
    : Infinity
  if (aDate !== bDate) return aDate - bDate
  return String(a.title ?? "").localeCompare(String(b.title ?? ""), "nl")
}

export function tieBreakByTitle(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): number {
  return String(a.title ?? "").localeCompare(String(b.title ?? ""), "nl")
}

export function sortListingBySalesforceOrder(
  list: Record<string, unknown>[],
  tieBreak?: (a: Record<string, unknown>, b: Record<string, unknown>) => number
): Record<string, unknown>[] {
  return [...list].sort((a, b) => compareBySalesforceOrder(a, b, tieBreak))
}
