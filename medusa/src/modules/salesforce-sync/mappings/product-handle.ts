/** URL-safe handle from Salesforce Product2 when StockKeepingUnit is empty. */
export function productHandleFromSalesforce(
  name: string | null | undefined,
  salesforceId: string,
  stockKeepingUnit?: string | null
): string {
  const sku = stockKeepingUnit?.trim()
  if (sku) {
    return sku
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 255)
  }

  const base =
    (name ?? "product")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "product"

  return `${base}-${salesforceId.slice(-6).toLowerCase()}`
}
