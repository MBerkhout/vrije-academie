import type { MetadataRoute } from 'next'
import { getSiteOrigin } from '@/lib/json-ld'
import { isNoIndexSite } from '@/lib/cms/seo-metadata'
import { fetchSitemapEntries } from '@/lib/cms/sitemap-queries'
import { dropMissingProducts, dropRedirectedEntries } from '@/lib/cms/sitemap-filter'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isNoIndexSite()) return []

  const origin = getSiteOrigin()
  // Only URLs that return 200: no Sanity redirect sources, no products missing in Medusa.
  const entries = await dropMissingProducts(await dropRedirectedEntries(await fetchSitemapEntries()))

  return entries.map(({ path, lastModified }) => ({
    url: `${origin}${path}`,
    lastModified,
  }))
}
