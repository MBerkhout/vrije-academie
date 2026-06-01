import { giftCardProductHandle } from "./gift-card-cart"

export type EventGroupListingRow = {
  record_type?: string | null
  show_in_plp?: boolean | null
}

/**
 * Product ids eligible for public storefront listings (Ons aanbod + Agenda).
 * Excludes gift card and products with EventGroup.show_in_plp === false.
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
    return eg.show_in_plp !== false
  })
}
