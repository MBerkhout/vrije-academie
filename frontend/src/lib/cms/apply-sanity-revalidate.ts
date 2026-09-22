import { revalidatePath, revalidateTag } from 'next/cache'
import { after } from 'next/server'

import {
  planSanityRevalidate,
  type SanityRevalidateBody,
} from './revalidate-sanity-plan'
import { revalidateStorefrontCacheInBackground } from './revalidate-storefront-cache'

function revalidateChrome(type: string): Record<string, unknown> {
  revalidateTag('general-settings', { expire: 0 })
  revalidatePath('/', 'layout')
  revalidatePath('/checkout', 'layout')
  after(async () => {
    try {
      await revalidateStorefrontCacheInBackground()
    } catch (err) {
      console.error('Failed to revalidate storefront cache after menu/footer change', err)
    }
  })
  return {
    revalidated: true,
    type,
    tag: 'general-settings',
    queued: 'storefront-paths',
  }
}

export function applySanityRevalidate(
  body: SanityRevalidateBody,
  options: { includeForceDynamicPages?: boolean } = {},
): { ok: boolean; json: Record<string, unknown> } {
  const plan = planSanityRevalidate(body, options)

  switch (plan.kind) {
    case 'chrome':
      return { ok: true, json: revalidateChrome(plan.type) }
    case 'category': {
      for (const path of plan.paths) {
        revalidatePath(path)
      }
      return { ok: true, json: { revalidated: true, type: body._type, paths: plan.paths } }
    }
    case 'page':
      revalidatePath(plan.path)
      return { ok: true, json: { revalidated: true, path: plan.path } }
    case 'skip':
      if (plan.reason === 'unsupported_type') {
        return {
          ok: false,
          json: { revalidated: false, reason: 'unsupported_type', type: plan.type },
        }
      }
      if (plan.reason === 'force_dynamic') {
        return {
          ok: false,
          json: {
            revalidated: false,
            reason: 'skipped',
            slug: plan.slug ?? null,
            note: 'VA Thuis pages are force-dynamic; no ISR cache to bust',
          },
        }
      }
      return {
        ok: false,
        json: { revalidated: false, reason: 'skipped', slug: plan.slug ?? null },
      }
  }
}
