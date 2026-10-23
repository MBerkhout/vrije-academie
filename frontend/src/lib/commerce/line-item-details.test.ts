import { describe, expect, it } from 'vitest'
import { DEFAULT_GIFT_CARD_HANDLE } from '@/lib/commerce/gift-card'
import { buildLineItemQuantityLabel } from '@/lib/commerce/line-item-details'

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
