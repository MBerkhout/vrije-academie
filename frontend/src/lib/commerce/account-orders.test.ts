import { describe, expect, it } from 'vitest'

import { isOrderVisibleInAccount } from '@/lib/commerce/account-orders'
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
