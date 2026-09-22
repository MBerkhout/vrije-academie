import { describe, expect, it } from 'vitest'
import { normalizeStoreCart } from './normalize-store-money'

describe('normalizeStoreCart gift card money', () => {
  it('converts a digitale cadeaubon line from major EUR to cents', () => {
    const cart = normalizeStoreCart({
      id: 'cart_1',
      subtotal: 50,
      discount_total: 0,
      tax_total: 8.68,
      total: 50,
      items: [
        {
          id: 'li_1',
          title: 'Digitale cadeaubon',
          quantity: 1,
          unit_price: 50,
          subtotal: 50,
          total: 50,
          is_giftcard: true,
          metadata: { gift_card: { amount_cents: 5000 } },
        },
      ],
    })

    expect(cart.items[0].unit_price).toBe(5000)
    expect(cart.items[0].total).toBe(5000)
    expect(cart.subtotal).toBe(5000)
    expect(cart.total).toBe(5000)
    expect(cart.tax_total).toBe(868)
  })

  it('converts mixed catalog + cadeaubon carts on one scale', () => {
    const cart = normalizeStoreCart({
      id: 'cart_2',
      subtotal: 68,
      discount_total: 0,
      tax_total: 0,
      total: 68,
      items: [
        {
          id: 'li_course',
          title: 'College',
          quantity: 1,
          unit_price: 18,
          subtotal: 18,
          total: 18,
        },
        {
          id: 'li_gift',
          title: 'Digitale cadeaubon',
          quantity: 1,
          unit_price: 50,
          subtotal: 50,
          total: 50,
          is_giftcard: true,
          metadata: { gift_card: { amount_cents: 5000 } },
        },
      ],
    })

    expect(cart.items[0].total).toBe(1800)
    expect(cart.items[1].total).toBe(5000)
    expect(cart.total).toBe(6800)
  })
})
