import { revalidatePath } from 'next/cache'
import { type NextRequest } from 'next/server'
import { parseBody } from 'next-sanity/webhook'

type SanityPageWebhookBody = {
  _type: string
  slug?: string
  isVaThuis?: boolean
}

function pagePathFromSlug(slug: string | undefined): string | null {
  if (!slug) return null
  if (slug === '/') return '/'
  if (slug.startsWith('va-thuis/') || slug === 'va-thuis') return null
  return `/${slug}`
}

/**
 * POST /api/revalidate/sanity
 * Busts Next.js ISR cache for a published CMS page.
 * Called by a Sanity webhook on page create/update/delete.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.SANITY_REVALIDATE_SECRET?.trim()
  if (!secret) {
    return Response.json({ error: 'SANITY_REVALIDATE_SECRET not configured' }, { status: 503 })
  }

  const { isValidSignature, body } = await parseBody<SanityPageWebhookBody>(req, secret)
  if (!isValidSignature || !body) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (body._type !== 'page') {
    return Response.json({ revalidated: false, reason: 'unsupported_type', type: body._type })
  }

  const path = pagePathFromSlug(body.slug)
  if (!path) {
    return Response.json({
      revalidated: false,
      reason: 'skipped',
      slug: body.slug ?? null,
      note: 'VA Thuis pages are force-dynamic; no ISR cache to bust',
    })
  }

  revalidatePath(path)
  return Response.json({ revalidated: true, path })
}
