import { applySanityRevalidate } from '@/lib/cms/apply-sanity-revalidate'
import { studioRevalidateCorsHeaders } from '@/lib/cms/studio-revalidate-cors'
import type { SanityRevalidateBody } from '@/lib/cms/revalidate-sanity-plan'

function jsonResponse(
  req: Request,
  body: unknown,
  status: number,
): Response {
  return Response.json(body, {
    status,
    headers: studioRevalidateCorsHeaders(req.headers.get('origin')),
  })
}

/**
 * POST /api/revalidate/studio
 * Manual ISR bust from Sanity Studio (page ⋯ menu → Clear page cache).
 * Auth: Bearer SANITY_STUDIO_REVALIDATE_SECRET (separate from the webhook HMAC).
 */
export async function OPTIONS(req: Request): Promise<Response> {
  const headers = studioRevalidateCorsHeaders(req.headers.get('origin'))
  if (!headers['Access-Control-Allow-Origin']) {
    return new Response(null, { status: 403 })
  }
  return new Response(null, { status: 204, headers })
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.SANITY_STUDIO_REVALIDATE_SECRET?.trim()
  if (!secret) {
    return jsonResponse(req, { error: 'SANITY_STUDIO_REVALIDATE_SECRET not configured' }, 503)
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return jsonResponse(req, { error: 'Unauthorized' }, 401)
  }

  let body: SanityRevalidateBody
  try {
    body = (await req.json()) as SanityRevalidateBody
  } catch {
    return jsonResponse(req, { error: 'Invalid JSON' }, 400)
  }

  if (!body || typeof body._type !== 'string') {
    return jsonResponse(req, { error: 'Missing _type' }, 400)
  }

  const result = applySanityRevalidate(body, { includeForceDynamicPages: true })
  return jsonResponse(req, result.json, result.ok ? 200 : 400)
}
