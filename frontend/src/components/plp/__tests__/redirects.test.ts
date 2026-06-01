import { describe, it, expect } from 'vitest'
import {
  singleCategoryRedirectTarget,
  resolvePlpFilterHref,
} from '../../../app/(main)/ons-aanbod/_state/redirects'
import { parseFilterState } from '../../../app/(main)/ons-aanbod/_state/url'
import { plpCategoryHref, PLP_BASE_PATH } from '@/lib/routes'

describe('singleCategoryRedirectTarget', () => {
  it('redirects when only a single category filter is present', () => {
    const params = { category: 'kunst' }
    const state = parseFilterState(params)
    expect(singleCategoryRedirectTarget(state, params)).toBe(plpCategoryHref('kunst'))
  })

  it('preserves page query when page > 1', () => {
    const params = { category: 'kunst', page: '2' }
    const state = parseFilterState(params)
    expect(singleCategoryRedirectTarget(state, params)).toBe(`${plpCategoryHref('kunst')}?page=2`)
  })

  it('does not redirect when q is set', () => {
    const params = { category: 'kunst', q: 'test' }
    const state = parseFilterState(params)
    expect(singleCategoryRedirectTarget(state, params)).toBeNull()
  })

  it('does not redirect when multiple categories', () => {
    const params = new URLSearchParams('category=kunst&category=muziek')
    const state = parseFilterState(params)
    expect(singleCategoryRedirectTarget(state, Object.fromEntries(params))).toBeNull()
  })
})

describe('resolvePlpFilterHref', () => {
  it('uses category path for a single category-only filter', () => {
    expect(resolvePlpFilterHref({ categories: ['kunstgeschiedenis'] })).toBe(
      plpCategoryHref('kunstgeschiedenis')
    )
  })

  it('uses base PLP query string for multiple categories', () => {
    expect(
      resolvePlpFilterHref({ categories: ['kunstgeschiedenis', 'museaal'] })
    ).toBe(`${PLP_BASE_PATH}?category=kunstgeschiedenis&category=museaal`)
  })

  it('uses base PLP when other filters are combined with one category', () => {
    expect(
      resolvePlpFilterHref({ categories: ['kunstgeschiedenis'], teachers: ['jan'] })
    ).toBe(`${PLP_BASE_PATH}?category=kunstgeschiedenis&docent=jan`)
  })
})
