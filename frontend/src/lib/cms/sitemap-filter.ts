import { getMedusaBackendUrl } from '@/lib/commerce/medusa-backend-url'
import { getRedirects, normalizeRedirectPath } from '@/lib/redirects'
import type { SitemapEntry } from './sitemap-queries'

function storeHeaders(): HeadersInit {
  const key = process.env.NEXT_PUBLIC_MEDUSA_API_KEY ?? ''
  return key ? { 'x-publishable-api-key': key } : {}
}

async function fetchPublishedProductHandles(): Promise<Set<string> | null> {
  try {
    const res = await fetch(`${getMedusaBackendUrl()}/store/events/published-handles`, {
      headers: storeHeaders(),
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { handles?: string[] }
    const list = data.handles ?? []
    return new Set(list.map((h) => h.trim().toLowerCase()).filter(Boolean))
  } catch {
    return null
  }
}

/** Drop entries whose URL would redirect (Sanity `redirect` documents). */
export async function dropRedirectedEntries(entries: SitemapEntry[]): Promise<SitemapEntry[]> {
  const sources = new Set((await getRedirects()).map((r) => r.source))
  return entries.filter((e) => !sources.has(normalizeRedirectPath(e.path)))
}

/**
 * Drop product entries that Medusa does not serve (their PDP would 404).
 * Uses one Medusa call (published handle set), not per-product PDP fetches.
 * Fails open: on a Medusa error the entry is kept, so an outage never empties the sitemap.
 */
export async function dropMissingProducts(entries: SitemapEntry[]): Promise<SitemapEntry[]> {
  const published = await fetchPublishedProductHandles()
  if (!published) return entries

  return entries.filter((e) => {
    if (!e.handle) return true
    return published.has(e.handle.trim().toLowerCase())
  })
}
