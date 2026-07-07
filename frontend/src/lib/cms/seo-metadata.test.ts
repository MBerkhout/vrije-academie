import { describe, expect, it } from 'vitest'
import { buildSeoMetadata, SITE_ROBOTS } from './seo-metadata'

describe('seo-metadata', () => {
  it('always applies site-wide noindex robots', () => {
    expect(SITE_ROBOTS).toEqual({
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    })

    expect(
      buildSeoMetadata(
        {
          metaTitle: 'Launch page',
          robotsMeta: ['index', 'follow'],
          nofollowAttributes: false,
        },
        { fallbackTitle: 'Fallback' }
      ).robots
    ).toEqual(SITE_ROBOTS)
  })
})
