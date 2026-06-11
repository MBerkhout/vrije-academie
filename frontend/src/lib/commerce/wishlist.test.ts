import { describe, expect, it } from 'vitest'
import { mergeWishlistHandles, parseWishlistHandles, WISHLIST_METADATA_KEY } from './wishlist'

describe('wishlist', () => {
  it('parses handles from customer metadata', () => {
    expect(
      parseWishlistHandles({
        [WISHLIST_METADATA_KEY]: ['  foo  ', 'bar', 1, ''],
      }),
    ).toEqual(['foo', 'bar'])
  })

  it('merges local before remote and dedupes', () => {
    expect(mergeWishlistHandles(['b', 'a'], ['a', 'c'])).toEqual(['b', 'a', 'c'])
  })
})
