import { describe, expect, it } from 'vitest'

import {
  findUpcomingOrderWithinTwoDays,
  getOrderTimeCategory,
  orderMatchesTimeFilter,
  isOrderVisibleInAccount,
} from '@/lib/commerce/account-orders'
import type { Order } from '@/lib/commerce/types'

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order_test',
    status: 'completed',
    total: 1000,
    subtotal: 1000,
    ...overrides,
  }
}

const now = new Date('2026-06-15T12:00:00.000Z')
const nowMs = now.getTime()

function line(
  overrides: Partial<{
    title: string
    start_at: string | null
    is_vathuis: boolean
  }> = {},
) {
  return {
    title: overrides.title ?? 'College',
    event_item: overrides.start_at
      ? {
          delivery_type: 'offline',
          start_at: overrides.start_at,
          end_at: null,
          city: 'Amsterdam',
        }
      : null,
    is_vathuis: overrides.is_vathuis ?? false,
    vathuis: null,
  }
}

describe('getOrderTimeCategory', () => {
  it('marks orders with a future session as upcoming', () => {
    expect(
      getOrderTimeCategory([line({ start_at: '2026-07-01T10:00:00.000Z' })], nowMs),
    ).toBe('upcoming')
  })

  it('marks orders with only past sessions as past', () => {
    expect(
      getOrderTimeCategory([line({ start_at: '2026-01-01T10:00:00.000Z' })], nowMs),
    ).toBe('past')
  })

  it('ignores vathuis lines for scheduling', () => {
    expect(
      getOrderTimeCategory(
        [line({ is_vathuis: true, start_at: '2026-07-01T10:00:00.000Z' })],
        nowMs,
      ),
    ).toBe('unscheduled')
  })
})

describe('findUpcomingOrderWithinTwoDays', () => {
  it('returns the soonest session within 48 hours', () => {
    const highlight = findUpcomingOrderWithinTwoDays(
      [
        {
          order: order({ id: 'o1' }),
          items: [
            line({ title: 'Later', start_at: '2026-06-16T18:00:00.000Z' }),
            line({ title: 'Soon', start_at: '2026-06-15T18:00:00.000Z' }),
          ],
        },
      ],
      nowMs,
    )
    expect(highlight?.orderId).toBe('o1')
    expect(highlight?.title).toBe('Soon')
  })

  it('ignores sessions outside the two-day window', () => {
    expect(
      findUpcomingOrderWithinTwoDays(
        [
          {
            order: order({ id: 'o1' }),
            items: [line({ start_at: '2026-06-20T10:00:00.000Z' })],
          },
        ],
        nowMs,
      ),
    ).toBeNull()
  })
})

describe('orderMatchesTimeFilter', () => {
  it('filters upcoming and past', () => {
    expect(orderMatchesTimeFilter('upcoming', 'upcoming')).toBe(true)
    expect(orderMatchesTimeFilter('past', 'upcoming')).toBe(false)
    expect(orderMatchesTimeFilter('unscheduled', 'all')).toBe(true)
    expect(orderMatchesTimeFilter('unscheduled', 'past')).toBe(false)
  })
})

describe('isOrderVisibleInAccount', () => {
  it('shows normal completed orders', () => {
    expect(isOrderVisibleInAccount(order())).toBe(true)
  })

  it('hides canceled orders', () => {
    expect(isOrderVisibleInAccount(order({ status: 'canceled' }))).toBe(false)
  })

  it('hides orders marked hidden_from_account', () => {
    expect(
      isOrderVisibleInAccount(
        order({ metadata: { hidden_from_account: true } })
      )
    ).toBe(false)
  })
})
