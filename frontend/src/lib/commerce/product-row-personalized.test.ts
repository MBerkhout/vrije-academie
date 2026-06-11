import { describe, expect, it } from 'vitest'
import {
  personalizedProductRowHeading,
  resolvePersonalizedProductRowHandles,
} from './product-row-personalized'

describe('product-row-personalized', () => {
  it('prefers wishlist handles over recent viewed', () => {
    expect(
      resolvePersonalizedProductRowHandles(['saved-a', 'saved-b'], ['recent-a', 'recent-b']),
    ).toEqual({
      mode: 'favorites',
      handles: ['saved-a', 'saved-b'],
    })
  })

  it('falls back to recent viewed when wishlist is empty', () => {
    expect(resolvePersonalizedProductRowHandles([], ['recent-a', 'recent-b'])).toEqual({
      mode: 'recent',
      handles: ['recent-a', 'recent-b'],
    })
  })

  it('returns none when both lists are empty', () => {
    expect(resolvePersonalizedProductRowHandles([], [])).toEqual({
      mode: 'none',
      handles: [],
    })
  })

  it('limits handles to four', () => {
    expect(
      resolvePersonalizedProductRowHandles(
        ['a', 'b', 'c', 'd', 'e'],
        [],
      ).handles,
    ).toHaveLength(4)
  })

  it('uses title overrides for favorites and recent', () => {
    const block = {
      title: 'Voor jou',
      titleFavorites: 'Jouw favorieten',
      titleRecent: 'Recent bekeken',
    }
    expect(personalizedProductRowHeading(block, 'favorites')).toBe('Jouw favorieten')
    expect(personalizedProductRowHeading(block, 'recent')).toBe('Recent bekeken')
  })

  it('falls back to base title when override is missing', () => {
    expect(personalizedProductRowHeading({ title: 'Voor jou' }, 'recent')).toBe('Voor jou')
  })
})
