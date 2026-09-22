import { describe, expect, it } from 'vitest'
import {
  productTypeLabelFromSlug,
  productTypeListLabelFromSlug,
  productTypePluralsFromCms,
  plpProductTypeBadgeLabel,
} from './plp-product-types'

describe('productTypeListLabelFromSlug', () => {
  it('uses Reizen for reis when CMS has no plural', () => {
    expect(productTypeListLabelFromSlug('reis')).toBe('Reizen')
    expect(productTypeListLabelFromSlug('Reis')).toBe('Reizen')
  })

  it('keeps other types singular unless CMS overrides them', () => {
    expect(productTypeListLabelFromSlug('studiedag')).toBe('Studiedag')
    expect(productTypeListLabelFromSlug('wandeling', { wandeling: 'Wandelingen' })).toBe(
      'Wandelingen',
    )
    expect(productTypeListLabelFromSlug('rondleiding')).toBe('Rondleidingen')
  })

  it('lets CMS override the reis fallback', () => {
    expect(productTypeListLabelFromSlug('reis', { reis: 'VA Reizen' })).toBe('VA Reizen')
  })
})

describe('productTypeLabelFromSlug / PDP badge', () => {
  it('stays singular for product pages', () => {
    expect(productTypeLabelFromSlug('reis')).toBe('Reis')
    expect(plpProductTypeBadgeLabel('Reis')).toBe('Reis')
    expect(plpProductTypeBadgeLabel('Rondleiding')).toBe('Rondleiding')
  })
})

describe('productTypePluralsFromCms', () => {
  it('drops blank values', () => {
    expect(productTypePluralsFromCms({ reis: '  Reizen  ', studiedag: '   ' })).toEqual({
      reis: 'Reizen',
    })
  })
})
