import { type NextRequest } from 'next/server'
import { parseBody } from 'next-sanity/webhook'

import { applySanityRevalidate } from '@/lib/cms/apply-sanity-revalidate'
import type { SanityRevalidateBody } from '@/lib/cms/revalidate-sanity-plan'

/**
 * POST /api/revalidate/sanity
 * Busts Next.js ISR cache for published CMS pages and site chrome (header/footer).
 * Called by a Sanity webhook on create/update/delete.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.SANITY_REVALIDATE_SECRET?.trim()
  if (!secret) {
    return Response.json({ error: 'SANITY_REVALIDATE_SECRET not configured' }, { status: 503 })
  }

  const { isValidSignature, body } = await parseBody<SanityRevalidateBody>(req, secret)
  if (!isValidSignature || !body) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = applySanityRevalidate(body)
  return Response.json(result.json)
}
