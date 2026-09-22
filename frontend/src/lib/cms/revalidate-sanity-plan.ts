import { categoryPublishRevalidatePaths } from './revalidate-storefront-cache'

export type SanityRevalidateBody = {
  _type: string
  slug?: string
}

export type SanityRevalidatePlan =
  | { kind: 'page'; path: string }
  | { kind: 'chrome'; type: string }
  | { kind: 'category'; paths: string[] }
  | {
      kind: 'skip'
      reason: 'unsupported_type' | 'missing_slug' | 'force_dynamic'
      type?: string
      slug?: string | null
    }

export function pageStorefrontPath(slug: string | undefined): string | null {
  if (!slug) return null
  const trimmed = slug.trim()
  if (!trimmed) return null
  if (trimmed === '/') return '/'
  return `/${trimmed.replace(/^\/+/, '')}`
}

export function isVaThuisStorefrontSlug(slug: string): boolean {
  const trimmed = slug.trim()
  return trimmed === 'va-thuis' || trimmed.startsWith('va-thuis/')
}

export function planSanityRevalidate(
  body: SanityRevalidateBody,
  options: { includeForceDynamicPages?: boolean } = {},
): SanityRevalidatePlan {
  if (body._type === 'generalSettings' || body._type === 'menu') {
    return { kind: 'chrome', type: body._type }
  }

  if (body._type === 'category') {
    return { kind: 'category', paths: categoryPublishRevalidatePaths(body.slug) }
  }

  if (body._type !== 'page') {
    return { kind: 'skip', reason: 'unsupported_type', type: body._type }
  }

  const path = pageStorefrontPath(body.slug)
  if (!path) {
    return { kind: 'skip', reason: 'missing_slug', slug: body.slug ?? null }
  }

  if (!options.includeForceDynamicPages && isVaThuisStorefrontSlug(body.slug ?? '')) {
    return { kind: 'skip', reason: 'force_dynamic', slug: body.slug ?? null }
  }

  return { kind: 'page', path }
}
