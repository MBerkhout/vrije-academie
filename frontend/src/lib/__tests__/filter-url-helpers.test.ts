import { describe, it, expect } from 'vitest'
import { resolveClearAllHref, AGENDA_BASE_PATH } from '@/lib/filter-url-helpers'
import { PLP_BASE_PATH, VATHUIS_CATALOG_PATH, plpCategoryHref, plpCityHref, plpProductTypeHref } from '@/lib/routes'

describe('resolveClearAllHref', () => {
  it('returns the unfiltered PLP for category and product-type landing pages', () => {
    expect(resolveClearAllHref(plpProductTypeHref('studiedag'))).toBe(PLP_BASE_PATH)
    expect(resolveClearAllHref(plpCategoryHref('kunstgeschiedenis'))).toBe(PLP_BASE_PATH)
  })

  it('returns the unfiltered PLP for city landing pages', () => {
    expect(resolveClearAllHref(plpCityHref('amsterdam'))).toBe(PLP_BASE_PATH)
  })

  it('stays on agenda and VA Thuis catalog', () => {
    expect(resolveClearAllHref(AGENDA_BASE_PATH)).toBe(AGENDA_BASE_PATH)
    expect(resolveClearAllHref(VATHUIS_CATALOG_PATH)).toBe(VATHUIS_CATALOG_PATH)
  })

  it('returns the base PLP for the unfiltered listing', () => {
    expect(resolveClearAllHref(PLP_BASE_PATH)).toBe(PLP_BASE_PATH)
  })
})
