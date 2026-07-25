import type { Cart } from '@/lib/commerce/types'
import type { CartItemExtras } from '@/lib/commerce/cart-item-extras'
import { appliedDiscountEntriesFromCart } from '@/lib/commerce/gift-card'
import { cartLineToCommerceItem } from '@/lib/analytics/mappers/commerce-item'
import { centsToEur } from '@/lib/analytics/mappers/money'

export type CartEcommercePayload = {
  currency: 'EUR'
  value: number
  coupon?: string
  items: ReturnType<typeof cartLineToCommerceItem>[]
}

export function buildCartEcommercePayload(
  cart: Cart,
  extrasList: (CartItemExtras | null | undefined)[] = []
): CartEcommercePayload {
  const items = cart.items.map((item, index) => {
    const extras = extrasList[index] ?? extrasList.find((e) => e?.line_item_id === item.id) ?? null
    return cartLineToCommerceItem(item, extras, index + 1)
  })

  const discounts = appliedDiscountEntriesFromCart(cart)
  const manualPromo = discounts.find((d) => d.kind === 'promo' && d.is_automatic !== true)

  return {
    currency: 'EUR',
    value: centsToEur(cart.total),
    ...(manualPromo ? { coupon: manualPromo.code } : {}),
    items,
  }
}
