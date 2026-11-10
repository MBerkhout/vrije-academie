import { medusaClient } from '@/lib/commerce/medusa-client'
import { getRedirects, normalizeRedirectPath } from '@/lib/redirects'
import type { SitemapEntry } from './sitemap-queries'

const CONCURRENCY = 8

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i])
      }
    }),
  )
  return out
}

/** Drop entries whose URL would redirect (Sanity `redirect` documents). */
export async function dropRedirectedEntries(entries: SitemapEntry[]): Promise<SitemapEntry[]> {
  const sources = new Set((await getRedirects()).map((r) => r.source))
  return entries.filter((e) => !sources.has(normalizeRedirectPath(e.path)))
}

/**
 * Drop product entries that Medusa does not serve (their PDP would 404).
 * Fails open: on a Medusa error the entry is kept, so an outage never empties the sitemap.
 */
export async function dropMissingProducts(entries: SitemapEntry[]): Promise<SitemapEntry[]> {
  const products = entries.filter((e) => e.handle)
  const exists = await mapLimit(products, CONCURRENCY, async (e) => {
    try {
      return Boolean(await medusaClient.getEvent(e.handle as string))
    } catch {
      return true
    }
  })
  const missing = new Set(products.filter((_, i) => !exists[i]))
  return entries.filter((e) => !missing.has(e))
}
