import { describe, expect, it } from 'vitest'
import {
  cartLineToCommerceItem,
  eventCardToCommerceItem,
  formatItemVariantFromEventItem,
} from '@/lib/analytics/mappers/commerce-item'

describe('formatItemVariantFromEventItem', () => {
  it('formats city, date and time', () => {
    expect(
      formatItemVariantFromEventItem({
        city: 'Amsterdam',
        delivery_type: 'offline',
        start_at: '2026-09-21T19:30:00.000Z',
      })
    ).toMatch(/Amsterdam.*21:30|Amsterdam.*19:30/)
  })

  it('uses Online when delivery is online without city', () => {
    expect(
      formatItemVariantFromEventItem({
        delivery_type: 'online',
        start_at: '2026-09-21T19:30:00.000Z',
      })
    ).toMatch(/^Online/)
  })
})

describe('eventCardToCommerceItem', () => {
  it('maps handle, categories and record type', () => {
    const item = eventCardToCommerceItem(
      {
        id: 'p1',
        handle: 'colleges-introductie-kunstgeschiedenis',
        title: 'Colleges Introductie kunstgeschiedenis',
        categories: [{ id: 'c1', slug: 'kunst', label: 'Kunstgeschiedenis' }],
        record_type: 'collegereeks',
        price_from: 34500,
      },
      { index: 1 }
    )
    expect(item).toMatchObject({
      item_id: 'colleges-introductie-kunstgeschiedenis',
      item_name: 'Colleges Introductie kunstgeschiedenis',
      item_category: 'Kunstgeschiedenis',
      item_category2: 'Collegereeks',
      price: 345,
      index: 1,
    })
  })
})

describe('cartLineToCommerceItem', () => {
  it('maps gift card lines to cadeaubon category', () => {
    const item = cartLineToCommerceItem(
      {
        id: 'li1',
        variant_id: 'v1',
        quantity: 1,
        unit_price: 5000,
        subtotal: 5000,
        total: 5000,
        title: 'Digitale cadeaubon',
        variant: { id: 'v1', title: '€50', price: 5000, inventory_quantity: 999 },
        metadata: { gift_card: { amount_cents: 5000 } },
      },
      null
    )
    expect(item).toMatchObject({
      item_id: 'cadeaubon',
      item_category: 'Cadeaubon',
      price: 50,
      quantity: 1,
    })
  })
})
