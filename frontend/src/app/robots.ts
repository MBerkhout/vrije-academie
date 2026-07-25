import type { MetadataRoute } from 'next'
import { getSiteOrigin } from '@/lib/json-ld'

export default function robots(): MetadataRoute.Robots {
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
