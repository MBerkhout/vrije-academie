import { describe, expect, it, vi } from 'vitest'

import {
  categoryPublishRevalidatePaths,
  mergeStorefrontPaths,
  revalidatePathsInBatches,
  REVALIDATE_BATCH_DELAY_MS,
  REVALIDATE_BATCH_SIZE,
  STOREFRONT_CHROME_PATHS,
} from './revalidate-storefront-cache'
import * as sitemapQueries from './sitemap-queries'

describe('categoryPublishRevalidatePaths', () => {
  it('always busts homepage and VA Thuis landing', () => {
    expect(categoryPublishRevalidatePaths(undefined)).toEqual(['/', '/va-thuis'])
    expect(categoryPublishRevalidatePaths('  ')).toEqual(['/', '/va-thuis'])
  })

  it('includes the category PLP when a slug is present', () => {
    expect(categoryPublishRevalidatePaths('kunstgeschiedenis')).toEqual([
      '/',
      '/va-thuis',
      '/ons-aanbod/kunstgeschiedenis',
    ])
  })
})

describe('revalidate-storefront-cache', () => {
  it('mergeStorefrontPaths deduplicates sitemap and chrome paths', () => {
    const merged = mergeStorefrontPaths(['/', '/ons-aanbod', '/login'], ['/login', '/bedankt'])
    expect(merged).toEqual(['/', '/ons-aanbod', '/login', '/bedankt'])
  })

  it('mergeStorefrontPaths includes all chrome paths by default', () => {
    const merged = mergeStorefrontPaths(['/'])
    for (const path of STOREFRONT_CHROME_PATHS) {
      expect(merged).toContain(path)
    }
  })

  it('collectStorefrontRevalidatePaths includes noIndex sitemap rows and chrome paths', async () => {
    vi.spyOn(sitemapQueries, 'fetchSitemapEntries').mockResolvedValue([
      { path: '/' },
      { path: '/private-page' },
      { path: '/ons-aanbod/foo' },
    ])

    const { collectStorefrontRevalidatePaths } = await import('./revalidate-storefront-cache')
    const paths = await collectStorefrontRevalidatePaths()

    expect(sitemapQueries.fetchSitemapEntries).toHaveBeenCalledWith({ includeNoIndex: true })
    expect(paths).toContain('/')
    expect(paths).toContain('/private-page')
    expect(paths).toContain('/ons-aanbod/foo')
    expect(paths).toContain('/winkelwagen')
    expect(paths).toContain('/mijn-account/aankopen')
  })

  it('revalidatePathsInBatches revalidates in chunks with delay between batches', async () => {
    const revalidated: string[] = []
    const sleepCalls: number[] = []

    const paths = Array.from({ length: REVALIDATE_BATCH_SIZE + 3 }, (_, i) => `/page-${i}`)
    const result = await revalidatePathsInBatches(paths, {
      batchSize: REVALIDATE_BATCH_SIZE,
      delayMs: REVALIDATE_BATCH_DELAY_MS,
      revalidate: (path) => {
        revalidated.push(path)
      },
      sleep: async (ms) => {
        sleepCalls.push(ms)
      },
    })

    expect(result).toEqual({ revalidated: REVALIDATE_BATCH_SIZE + 3, batches: 2 })
    expect(revalidated).toEqual(paths)
    expect(sleepCalls).toEqual([REVALIDATE_BATCH_DELAY_MS])
  })

  it('revalidatePathsInBatches skips delay after the final batch', async () => {
    const sleep = vi.fn(async () => {})

    await revalidatePathsInBatches(['/a', '/b'], {
      batchSize: REVALIDATE_BATCH_SIZE,
      revalidate: () => {},
      sleep,
    })

    expect(sleep).not.toHaveBeenCalled()
  })
})
