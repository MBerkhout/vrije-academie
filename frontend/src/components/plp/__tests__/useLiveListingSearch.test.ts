import { describe, expect, it } from 'vitest'
import { listingFiltersKeyWithoutQuery } from '../useLiveListingSearch'

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
