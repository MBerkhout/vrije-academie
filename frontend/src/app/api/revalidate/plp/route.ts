import { revalidateTag } from 'next/cache'

import { AGENDA_DEFAULT_CACHE_TAG } from '@/lib/agenda/cached-default-listing'
import {
  pdpEventTag,
  pdpSimilarTag,
} from '@/lib/commerce/cached-pdp'
import { PLP_DEFAULT_CACHE_TAG } from '@/lib/plp/cached-default-listing'

type RevalidateBody = {
  pdpHandles?: string[]
  plp?: boolean
  agenda?: boolean
}

/**
 * POST /api/revalidate/plp
 * Busts default PLP/Agenda hard caches and optional PDP Medusa caches (`pdpHandles`).
 * Called by Medusa when listing or event detail caches change.
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

  let body: RevalidateBody = {}
  try {
    const text = await req.text()
    if (text.trim()) body = JSON.parse(text) as RevalidateBody
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const tags: string[] = []
  const onlyPdp =
    Object.keys(body).length > 0 &&
    Object.keys(body).every((k) => k === 'pdpHandles') &&
    (body.pdpHandles?.length ?? 0) > 0
  const bustPlp = onlyPdp ? false : body.plp !== false
  const bustAgenda = onlyPdp ? false : body.agenda !== false
  if (bustPlp) {
    revalidateTag(PLP_DEFAULT_CACHE_TAG, { expire: 0 })
    tags.push(PLP_DEFAULT_CACHE_TAG)
  }
  if (bustAgenda) {
    revalidateTag(AGENDA_DEFAULT_CACHE_TAG, { expire: 0 })
    tags.push(AGENDA_DEFAULT_CACHE_TAG)
  }

  for (const raw of body.pdpHandles ?? []) {
    const handle = typeof raw === 'string' ? raw.trim() : ''
    if (!handle) continue
    const eventTag = pdpEventTag(handle)
    const similarTag = pdpSimilarTag(handle)
    revalidateTag(eventTag, { expire: 0 })
    revalidateTag(similarTag, { expire: 0 })
    tags.push(eventTag, similarTag)
  }

  return Response.json({
    revalidated: true,
    tags,
  })
}
