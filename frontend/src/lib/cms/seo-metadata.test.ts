import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildProductPdpMetadata,
  buildSeoMetadata,
  buildSiteMetadata,
  isNoIndexSite,
  NOINDEX_ROBOTS,
  noIndexMetadata,
  resolveSeoDescription,
  resolveSeoTitle,
} from './seo-metadata'

describe('seo-metadata', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('buildSiteMetadata sets metadataBase from site origin', () => {
    const meta = buildSiteMetadata({ title: 'Test' })
    expect(meta.metadataBase?.toString()).toMatch(/^https?:\/\//)
    expect(meta.title).toBe('Test')
  })

  it('isNoIndexSite is true only for the v2 staging host', () => {
    expect(isNoIndexSite('https://v2.vrijeacademie.nl')).toBe(true)
    expect(isNoIndexSite('https://v2.vrijeacademie.nl/')).toBe(true)
    expect(isNoIndexSite('https://www.vrijeacademie.nl')).toBe(false)
    expect(isNoIndexSite('https://vrijeacademie.nl')).toBe(false)
    expect(isNoIndexSite('not-a-url')).toBe(false)
  })

  it('buildSiteMetadata and buildSeoMetadata force noindex on v2', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://v2.vrijeacademie.nl')
    expect(buildSiteMetadata({ title: 'Staging' }).robots).toEqual(NOINDEX_ROBOTS)
    expect(buildSeoMetadata(null, { fallbackTitle: 'Page' }).robots).toEqual(NOINDEX_ROBOTS)
  })

  it('resolveSeoTitle prefers editorial meta title over fallback', () => {
    expect(resolveSeoTitle({ metaTitle: 'Editorial' }, 'Fallback')).toBe('Editorial')
    expect(resolveSeoTitle(null, 'Fallback')).toBe('Fallback')
  })

  it('resolveSeoDescription prefers editorial meta description over fallback', () => {
    expect(resolveSeoDescription({ metaDescription: 'Desc' }, 'Fallback')).toBe('Desc')
    expect(resolveSeoDescription(null, 'Fallback')).toBe('Fallback')
  })

  it('buildSeoMetadata maps noIndex to robots and sets canonical from path', () => {
    const meta = buildSeoMetadata(
      { metaTitle: 'Page', metaDescription: 'About us', noIndex: true },
      { path: '/about' },
    )

    expect(meta.robots).toEqual(NOINDEX_ROBOTS)
    expect(meta.alternates?.canonical).toMatch(/\/about$/)
    expect(meta.openGraph?.title).toBe('Page')
    expect(meta.openGraph?.url).toMatch(/\/about$/)
  })

  it('buildSeoMetadata uses fallbacks when editorial fields are empty', () => {
    const meta = buildSeoMetadata(null, {
      fallbackTitle: 'Fallback title',
      fallbackDescription: 'Fallback description',
      fallbackImage: 'https://example.com/image.jpg',
      path: '/ons-aanbod',
    })

    expect(meta.title).toBe('Fallback title')
    expect(meta.description).toBe('Fallback description')
    expect(meta.openGraph?.images).toEqual(['https://example.com/image.jpg'])
  })

  it('buildProductPdpMetadata prefers editorial seo over Salesforce mirror', () => {
    const meta = buildProductPdpMetadata(
      {
        seo: { metaTitle: 'Editorial title', metaDescription: 'Editorial desc' },
        seoTitle: 'SF title',
        seoDescription: 'SF desc',
      },
      { title: 'Event title', description: 'Event description' },
      'Vrije Academie',
      '/ons-aanbod/handle',
    )

    expect(meta.title).toBe('Editorial title')
    expect(meta.description).toBe('Editorial desc')
  })

  it('buildProductPdpMetadata falls back to Salesforce mirror then event data', () => {
    const meta = buildProductPdpMetadata(
      { seoTitle: 'SF title', seoDescription: 'SF desc' },
      { title: 'Event title', description: 'Event description' },
      'Vrije Academie',
      '/ons-aanbod/handle',
    )

    expect(meta.title).toBe('SF title | Vrije Academie')
    expect(meta.description).toBe('SF desc')
  })

  it('noIndexMetadata applies utility robots directive', () => {
    expect(noIndexMetadata('Login')).toEqual({
      title: 'Login',
      robots: NOINDEX_ROBOTS,
    })
  })
})
