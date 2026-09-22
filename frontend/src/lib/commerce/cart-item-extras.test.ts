import { describe, expect, it } from 'vitest'
import { isVathuisCartLine, type CartItemExtras } from './cart-item-extras'

function extras(overrides: Partial<CartItemExtras> = {}): CartItemExtras {
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

describe('isVathuisCartLine', () => {
  it('is true when extras mark the line as VA Thuis', () => {
    expect(isVathuisCartLine(extras({ is_vathuis: true }))).toBe(true)
  })

  it('is true when vathuis display fields are present', () => {
    expect(
      isVathuisCartLine(
        extras({
          vathuis: { episode_count_label: '4 afleveringen', play_time: '2 uur' },
        }),
      ),
    ).toBe(true)
  })

  it('is false for ordinary session lines', () => {
    expect(isVathuisCartLine(extras())).toBe(false)
    expect(isVathuisCartLine(null)).toBe(false)
  })
})
