import type { MetadataRoute } from 'next'
import { getSiteOrigin } from '@/lib/json-ld'
import { fetchSitemapEntries } from '@/lib/cms/sitemap-queries'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin()
  const entries = await fetchSitemapEntries()

  return entries.map(({ path, lastModified }) => ({
    url: `${origin}${path}`,
    lastModified,
  }))
}
