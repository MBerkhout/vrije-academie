import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GIFT_CARD_HANDLE,
  GIFT_CARD_THUMBNAIL_SRC,
  resolveLineItemThumbnail,
} from './gift-card'

describe('resolveLineItemThumbnail', () => {
  it('uses the static cadeaubon thumb for gift-card purchase lines', () => {
    expect(
      resolveLineItemThumbnail({ is_giftcard: true, thumbnail: null }, { thumbnail: null, product_handle: DEFAULT_GIFT_CARD_HANDLE }),
    ).toBe(GIFT_CARD_THUMBNAIL_SRC)
    expect(
      resolveLineItemThumbnail({ metadata: { gift_card: { amount_cents: 5000 } } }),
    ).toBe(GIFT_CARD_THUMBNAIL_SRC)
  })

  it('uses the static cadeaubon thumb when extras point at the gift-card product', () => {
    expect(
      resolveLineItemThumbnail({ thumbnail: 'https://cdn.example/other.jpg' }, {
        thumbnail: 'https://cdn.example/other.jpg',
        product_handle: DEFAULT_GIFT_CARD_HANDLE,
      }),
    ).toBe(GIFT_CARD_THUMBNAIL_SRC)
  })

  it('keeps catalog extras/item thumbnails for ordinary lines', () => {
    expect(
      resolveLineItemThumbnail({ thumbnail: 'https://cdn.example/item.jpg' }, {
        thumbnail: 'https://cdn.example/extras.jpg',
        product_handle: 'college-filosofie',
      }),
    ).toBe('https://cdn.example/extras.jpg')
    expect(resolveLineItemThumbnail({ thumbnail: 'https://cdn.example/item.jpg' })).toBe(
      'https://cdn.example/item.jpg',
    )
    expect(resolveLineItemThumbnail({ thumbnail: null })).toBeNull()
  })
})
