import { describe, expect, it } from 'vitest'
import {
  listingFiltersKeyWithoutQuery,
  shouldSkipLiveListingFetch,
} from '../useLiveListingSearch'

describe('listingFiltersKeyWithoutQuery', () => {
  it('ignores q so live search URL sync does not change the key', () => {
    const base = { categories: ['a'], sort: 'order' as const }
    expect(listingFiltersKeyWithoutQuery({ ...base, q: 'hello world' })).toBe(
      listingFiltersKeyWithoutQuery({ ...base, q: 'world' })
    )
    expect(listingFiltersKeyWithoutQuery({ ...base, q: undefined })).toBe(
      listingFiltersKeyWithoutQuery(base)
    )
  })

  it('changes when non-query filters change', () => {
    const a = listingFiltersKeyWithoutQuery({ categories: ['a'], q: 'x' })
    const b = listingFiltersKeyWithoutQuery({ categories: ['b'], q: 'x' })
    expect(a).not.toBe(b)
  })
})

describe('shouldSkipLiveListingFetch', () => {
  it('skips only when local query matches last committed search', () => {
    expect(shouldSkipLiveListingFetch('', '')).toBe(true)
    expect(shouldSkipLiveListingFetch('', 'a')).toBe(false)
    expect(shouldSkipLiveListingFetch('a', 'a')).toBe(true)
    expect(shouldSkipLiveListingFetch('ab', 'a')).toBe(false)
  })
})
