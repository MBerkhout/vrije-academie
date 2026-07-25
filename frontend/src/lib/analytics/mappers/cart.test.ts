import { describe, expect, it } from 'vitest'
import { buildCartEcommercePayload } from '@/lib/analytics/mappers/cart'
import type { Cart } from '@/lib/commerce/types'

const baseCart: Cart = {
  id: 'cart_1',
  items: [
    {
      id: 'li1',
      variant_id: 'v1',
      quantity: 1,
      unit_price: 34500,
      subtotal: 34500,
      total: 34500,
      title: 'Colleges Introductie kunstgeschiedenis',
      variant: { id: 'v1', title: 'Sessie', price: 34500, inventory_quantity: 10 },
    },
  ],
  subtotal: 34500,
  discount_total: 0,
  tax_total: 0,
  total: 34500,
  promotions: [{ code: 'WELKOM10', is_automatic: false }],
}

describe('buildCartEcommercePayload', () => {
  it('converts cents to EUR and includes manual coupon', () => {
    const payload = buildCartEcommercePayload(baseCart, [
      {
        line_item_id: 'li1',
        product_id: 'p1',
        product_handle: 'colleges-introductie-kunstgeschiedenis',
        product_title: 'Colleges Introductie kunstgeschiedenis',
        thumbnail: null,
        event_item: {
          delivery_type: 'offline',
          start_at: '2026-09-21T19:30:00.000Z',
          end_at: null,
          city: 'Amsterdam',
        },
        vathuis: null,
        instructor_names: [],
      },
    ])
    expect(payload.currency).toBe('EUR')
    expect(payload.value).toBe(345)
    expect(payload.coupon).toBe('WELKOM10')
    expect(payload.items[0]?.item_id).toBe('colleges-introductie-kunstgeschiedenis')
    expect(payload.items[0]?.item_variant).toMatch(/Amsterdam/)
  })

  it('omits automatic promotions from coupon field', () => {
    const cart: Cart = {
      ...baseCart,
      promotions: [{ code: 'AUTO', is_automatic: true }],
    }
    const payload = buildCartEcommercePayload(cart)
    expect(payload.coupon).toBeUndefined()
  })
})
