import type { Cart, CartItem } from './types'

function lineItemCreatedMs(item: CartItem): number | null {
  const raw = item.created_at ?? item.createdAt
  if (!raw) return null
  const t = new Date(raw).getTime()
  return Number.isFinite(t) ? t : null
}

/** Oldest line items first (add order), then `id` for a deterministic tie-break. */
export function sortCartLineItemsStable(items: CartItem[]): CartItem[] {
  return [...items].sort((a, b) => {
    const at = lineItemCreatedMs(a)
    const bt = lineItemCreatedMs(b)
    if (at != null && bt != null && at !== bt) {
      return at - bt
    }
    return a.id.localeCompare(b.id)
  })
}

export function withSortedCartItems(cart: Cart | null): Cart | null {
  if (!cart) return null
  if (!cart.items.length) return cart
  return { ...cart, items: sortCartLineItemsStable(cart.items) }
}
