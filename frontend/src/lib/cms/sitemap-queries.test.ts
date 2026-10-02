import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchSitemapEntries } from './sitemap-queries'

const mockFetch = vi.fn()

vi.mock('./sanity-preview-client', () => ({
  sanityPreviewClient: {
    withConfig: () => ({
      fetch: (...args: unknown[]) => mockFetch(...args),
    }),
  },
}))

describe('fetchSitemapEntries', () => {
  afterEach(() => {
    mockFetch.mockReset()
  })

  it('excludes linked-online slave products from sitemap paths', async () => {
    mockFetch.mockImplementation((query: string) => {
      if (query.includes('isLinkedOnlineSlave')) {
        return Promise.resolve([
          {
            handle: 'parent-studiedag',
            recordType: 'studiedag',
            _updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            handle: 'online-slave-studiedag',
            recordType: 'studiedag',
            isLinkedOnlineSlave: true,
            _updatedAt: '2026-01-02T00:00:00.000Z',
          },
        ])
      }
      return Promise.resolve([])
    })

    const entries = await fetchSitemapEntries({ includeNoIndex: true })
    const productPaths = entries
      .map((entry) => entry.path)
      .filter((path) => path.startsWith('/ons-aanbod/'))

    expect(productPaths).toContain('/ons-aanbod/parent-studiedag')
    expect(productPaths).not.toContain('/ons-aanbod/online-slave-studiedag')
  })
})
