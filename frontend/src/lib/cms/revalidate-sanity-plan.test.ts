import { describe, expect, it } from 'vitest'

import {
  isVaThuisStorefrontSlug,
  pageStorefrontPath,
  planSanityRevalidate,
} from './revalidate-sanity-plan'

describe('pageStorefrontPath', () => {
  it('maps homepage, nested, and trimmed slugs', () => {
    expect(pageStorefrontPath('/')).toBe('/')
    expect(pageStorefrontPath('over-ons')).toBe('/over-ons')
    expect(pageStorefrontPath('  va-thuis/foo  ')).toBe('/va-thuis/foo')
    expect(pageStorefrontPath('/over-ons')).toBe('/over-ons')
  })

  it('returns null when slug is missing', () => {
    expect(pageStorefrontPath(undefined)).toBeNull()
    expect(pageStorefrontPath('')).toBeNull()
    expect(pageStorefrontPath('   ')).toBeNull()
  })
})

describe('planSanityRevalidate', () => {
  it('plans chrome busts for settings and menus', () => {
    expect(planSanityRevalidate({ _type: 'generalSettings' })).toEqual({
      kind: 'chrome',
      type: 'generalSettings',
    })
    expect(planSanityRevalidate({ _type: 'menu' })).toEqual({ kind: 'chrome', type: 'menu' })
  })

  it('plans category thumbnail paths', () => {
    expect(planSanityRevalidate({ _type: 'category', slug: 'kunst' })).toEqual({
      kind: 'category',
      paths: ['/', '/va-thuis', '/ons-aanbod/kunst'],
    })
  })

  it('skips VA Thuis pages on the webhook path and includes them when asked', () => {
    expect(planSanityRevalidate({ _type: 'page', slug: 'va-thuis' })).toEqual({
      kind: 'skip',
      reason: 'force_dynamic',
      slug: 'va-thuis',
    })
    expect(
      planSanityRevalidate(
        { _type: 'page', slug: 'va-thuis/over' },
        { includeForceDynamicPages: true },
      ),
    ).toEqual({ kind: 'page', path: '/va-thuis/over' })
  })

  it('plans a normal CMS page path', () => {
    expect(planSanityRevalidate({ _type: 'page', slug: 'over-ons' })).toEqual({
      kind: 'page',
      path: '/over-ons',
    })
  })

  it('skips unknown types and pages without a slug', () => {
    expect(planSanityRevalidate({ _type: 'product' })).toEqual({
      kind: 'skip',
      reason: 'unsupported_type',
      type: 'product',
    })
    expect(planSanityRevalidate({ _type: 'page' })).toEqual({
      kind: 'skip',
      reason: 'missing_slug',
      slug: null,
    })
  })
})

describe('isVaThuisStorefrontSlug', () => {
  it('matches landing and nested VA Thuis slugs', () => {
    expect(isVaThuisStorefrontSlug('va-thuis')).toBe(true)
    expect(isVaThuisStorefrontSlug('va-thuis/foo')).toBe(true)
    expect(isVaThuisStorefrontSlug('over-ons')).toBe(false)
  })
})
