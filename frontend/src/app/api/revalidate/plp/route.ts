import { revalidateTag } from 'next/cache'

import { PLP_DEFAULT_CACHE_TAG } from '@/lib/plp/cached-default-listing'

/**
 * POST /api/revalidate/plp
 * Busts the Next.js hard cache for default `/ons-aanbod`.
 * Called by Medusa when listing snapshot cache is invalidated (top-of-list product changes).
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
  return Response.json({ revalidated: true, tag: PLP_DEFAULT_CACHE_TAG })
}
