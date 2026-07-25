/** Salesforce Order/OrderItem amounts use major EUR (e.g. 345 = €345). */
export function centsToMajorEur(cents: number): number {
  return Math.round(cents) / 100
}

export function majorEurToCents(major: number): number {
  return Math.round(major * 100)
}

/** Order/cart graph fields (unit_price, total, adjustments) use major currency units. */
export function parseMedusaMoney(value: unknown): number {
  if (value == null) return 0
  if (typeof value === "number") return value
  if (typeof value === "object" && value !== null && "numeric_" in (value as object)) {
    return Number((value as { numeric_: number }).numeric_)
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Convert order/cart graph money to integer cents for internal sync payloads. */
export function medusaOrderMoneyToCents(value: unknown): number {
  const major = parseMedusaMoney(value)
  if (!Number.isFinite(major)) return 0
  return Math.round(major * 100)
}
