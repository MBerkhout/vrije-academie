import { describe, it, expect } from 'vitest'
import {
  plpCategoryHref,
  plpProductPath,
  plpRecordTypeHref,
  PLP_BASE_PATH,
  VATHUIS_BASE_PATH,
} from '../routes'

describe('plpCategoryHref', () => {
  it('returns path-based category PLP URL', () => {
    expect(plpCategoryHref('kunst')).toBe(`${PLP_BASE_PATH}/kunst`)
  })

  it('encodes slug segments', () => {
    expect(plpCategoryHref('fine art')).toBe(`${PLP_BASE_PATH}/fine%20art`)
  })
})

describe('plpProductPath', () => {
  it('uses same segment as category (disambiguated at runtime)', () => {
    expect(plpProductPath('my-course')).toBe(`${PLP_BASE_PATH}/my-course`)
  })
})

describe('plpRecordTypeHref', () => {
  it('returns query filter on Ons aanbod', () => {
    expect(plpRecordTypeHref('collegereeks')).toBe(`${PLP_BASE_PATH}?record_type=collegereeks`)
  })

  it('normalizes casing and whitespace', () => {
    expect(plpRecordTypeHref(' Collegereeks ')).toBe(`${PLP_BASE_PATH}?record_type=collegereeks`)
  })

  it('routes vathuis to VA Thuis home', () => {
    expect(plpRecordTypeHref('vathuis')).toBe(VATHUIS_BASE_PATH)
  })
})
