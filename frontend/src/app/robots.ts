import type { MetadataRoute } from 'next'
import { getSiteOrigin } from '@/lib/json-ld'
import { isNoIndexSite } from '@/lib/cms/seo-metadata'

export default function robots(): MetadataRoute.Robots {
  if (isNoIndexSite()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

  const origin = getSiteOrigin()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/mijn-account',
        '/checkout',
        '/afrekenen',
        '/login',
        '/winkelwagen',
        '/zoeken',
        '/dev',
        '/api',
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  }
}
