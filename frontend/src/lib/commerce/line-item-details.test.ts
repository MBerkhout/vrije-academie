import { describe, expect, it } from 'vitest'
import { DEFAULT_GIFT_CARD_HANDLE } from '@/lib/commerce/gift-card'
import type { CartItemExtras } from '@/lib/commerce/cart-item-extras'
import type { CartItem } from '@/lib/commerce/types'
import {
  buildCartLineItemDetailBlocks,
  buildLineItemQuantityLabel,
} from '@/lib/commerce/line-item-details'

const baseItem: CartItem = {
  id: 'li1',
  variant_id: 'var_1',
  quantity: 1,
  unit_price: 2500,
  subtotal: 2500,
  total: 2500,
  title: 'College',
  variant: { id: 'var_1', title: 'Sessie', price: 2500, inventory_quantity: 1 },
}

function baseExtras(overrides: Partial<CartItemExtras> = {}): CartItemExtras {
  return {
    line_item_id: 'li1',
    product_id: 'p1',
    product_handle: 'college',
    product_title: 'College',
    thumbnail: null,
    event_item: null,
    vathuis: null,
    instructor_names: [],
    ...overrides,
  }
}

describe('buildLineItemQuantityLabel', () => {
  it('omits label for cadeaubon lines (metadata or product handle)', () => {
    expect(
      buildLineItemQuantityLabel({ quantity: 1, metadata: { gift_card: { amount_cents: 5000 } } }),
    ).toBe('')
    expect(
      buildLineItemQuantityLabel(
        { quantity: 1 },
        { product_handle: DEFAULT_GIFT_CARD_HANDLE },
      ),
    ).toBe('')
  })

  it('omits label for VA Thuis lines', () => {
    expect(buildLineItemQuantityLabel({ quantity: 1 }, { is_vathuis: true })).toBe('')
    expect(
      buildLineItemQuantityLabel(
        { quantity: 2 },
        {
          vathuis: { episode_count_label: '12 afleveringen', play_time: '6 uur' },
        },
      ),
    ).toBe('')
  })

  it('shows ticket count for session lines', () => {
    expect(buildLineItemQuantityLabel({ quantity: 1 })).toBe('1 ticket')
    expect(buildLineItemQuantityLabel({ quantity: 3 })).toBe('3 tickets')
  })
})

describe('buildCartLineItemDetailBlocks session location', () => {
  it('shows Online for online delivery when city is empty', () => {
    const blocks = buildCartLineItemDetailBlocks(
      baseItem,
      baseExtras({
        event_item: {
          delivery_type: 'online',
          start_at: '2026-09-22T19:00:00.000Z',
          end_at: '2026-09-22T21:00:00.000Z',
          city: null,
        },
      }),
    )
    const session = blocks.find((b) => b.kind === 'session')
    expect(session).toMatchObject({ kind: 'session' })
    if (session?.kind !== 'session') return
    expect(session.lines[0]).toBe('Online')
    expect(session.lines.length).toBeGreaterThan(1)
  })

  it('shows city for offline sessions', () => {
    const blocks = buildCartLineItemDetailBlocks(
      baseItem,
      baseExtras({
        event_item: {
          delivery_type: 'offline',
          start_at: '2026-09-22T19:00:00.000Z',
          end_at: null,
          city: 'Utrecht',
        },
      }),
    )
    const session = blocks.find((b) => b.kind === 'session')
    expect(session).toMatchObject({ kind: 'session' })
    if (session?.kind !== 'session') return
    expect(session.lines[0]).toBe('Utrecht')
  })

  it('normalizes city label "online" to Online', () => {
    const blocks = buildCartLineItemDetailBlocks(
      baseItem,
      baseExtras({
        event_item: {
          delivery_type: 'offline',
          start_at: null,
          end_at: null,
          city: 'online',
        },
      }),
    )
    const session = blocks.find((b) => b.kind === 'session')
    if (session?.kind !== 'session') return
    expect(session.lines[0]).toBe('Online')
  })
})
