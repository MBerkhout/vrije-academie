import { giftCardProductHandle } from "./gift-card-cart"

export type EventGroupListingRow = {
  record_type?: string | null
  show_in_plp?: boolean | null
}

/**
 * Product ids eligible for public storefront listings (Ons aanbod + Agenda).
 * Excludes gift card and vathuis products.
 * `show_in_plp` is ignored for now (still stored; re-enable before production).
 */
export function filterStoreListingProductIds(
  productIds: string[],
  productHandleById: Record<string, string | undefined>,
  eventGroupByProduct: Record<string, EventGroupListingRow | null | undefined>
): string[] {
  const giftCardHandle = giftCardProductHandle()
  return productIds.filter((id) => {
    const handle = productHandleById[id]
    if (handle === giftCardHandle) return false
    const eg = eventGroupByProduct[id]
    if (!eg) return true
    if (eg.record_type === "vathuis") return false
    return true
  })
}
