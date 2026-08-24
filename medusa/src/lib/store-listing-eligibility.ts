import { giftCardProductHandle } from "./gift-card-cart"

export type EventGroupListingRow = {
  record_type?: string | null
  show_in_plp?: boolean | null
}

export function isLinkedOnlineSlaveProduct(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return metadata?.salesforce_is_linked_online_slave === true
}

/**
 * Product ids eligible for public storefront listings (Ons aanbod + Agenda).
 * Excludes gift card, vathuis, and linked-online slave catalogs.
 *
 * `show_in_plp` is still stored in admin but not enforced here yet — SF imports
 * default to hidden and bulk enable is done separately (`enable-show-in-plp.ts`).
 * Linked-online slaves are always excluded via metadata so they never duplicate
 * the parent hybrid card on Ons aanbod. Unpublished (draft) products are excluded
 * when status is provided — Salesforce **Zichtbaar op Website** uncheck drafts the product.
 */
export function filterStoreListingProductIds(
  productIds: string[],
  productHandleById: Record<string, string | undefined>,
  eventGroupByProduct: Record<string, EventGroupListingRow | null | undefined>,
  productMetadataById: Record<string, Record<string, unknown> | null | undefined> = {},
  productStatusById: Record<string, string | undefined> = {}
): string[] {
  const giftCardHandle = giftCardProductHandle()
  return productIds.filter((id) => {
    const handle = productHandleById[id]
    if (handle === giftCardHandle) return false

    const status = productStatusById[id]
    if (status && status !== "published") return false

    const metadata = productMetadataById[id]
    if (isLinkedOnlineSlaveProduct(metadata)) return false

    const eg = eventGroupByProduct[id]
    if (!eg) return true
    if (eg.record_type === "vathuis") return false
    return true
  })
}
