import { revalidatePath, revalidateTag } from 'next/cache'
import { after } from 'next/server'

import { AGENDA_DEFAULT_CACHE_TAG } from '@/lib/agenda/cached-default-listing'
import { PLP_DEFAULT_CACHE_TAG } from '@/lib/plp/cached-default-listing'
import { revalidateStorefrontCacheInBackground } from '@/lib/cms/revalidate-storefront-cache'

/**
 * POST /api/revalidate/all
 * Queues a full storefront ISR refresh (all sitemap paths + chrome + sitemap.xml / robots.txt).
 * Safe on a live site: returns immediately; pages regenerate on next request.
 */
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.REVALIDATE_SECRET?.trim()
  if (!secret) {
    return Response.json({ error: 'REVALIDATE_SECRET not configured' }, { status: 503 })
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  revalidateTag(PLP_DEFAULT_CACHE_TAG, { expire: 0 })
  revalidateTag(AGENDA_DEFAULT_CACHE_TAG, { expire: 0 })
  revalidateTag('general-settings', { expire: 0 })
  revalidatePath('/', 'layout')
  revalidatePath('/checkout', 'layout')
  revalidatePath('/sitemap.xml')
  revalidatePath('/robots.txt')

  after(async () => {
    try {
      await revalidateStorefrontCacheInBackground()
    } catch (err) {
      console.error('Failed to revalidate storefront cache in background', err)
    }
  })

  return Response.json({
    revalidated: true,
    queued: 'storefront-paths',
    tags: [PLP_DEFAULT_CACHE_TAG, AGENDA_DEFAULT_CACHE_TAG, 'general-settings'],
    paths: ['/sitemap.xml', '/robots.txt'],
  })
}
