import type { Metadata } from 'next'
import { getSiteOrigin } from '@/lib/json-ld'
import type { SEO } from './types'

/** Default share image (public asset; resolved via root `metadataBase`). */
export const DEFAULT_OG_IMAGE_PATH = '/branding/logo.svg'

/** Staging host — must not appear in search results. */
export const NOINDEX_HOST = 'v2.vrijeacademie.nl'

/** True when this deploy (or origin) is the v2 staging host. */
export function isNoIndexSite(origin = getSiteOrigin()): boolean {
  try {
    return new URL(origin).hostname === NOINDEX_HOST
  } catch {
    return false
  }
}

export function resolveSeoImageUrl(seo?: SEO | null): string | undefined {
  return seo?.metaImage?.asset?.url
}

/** Editorial SEO image → page fallback (e.g. PDP photo) → branding logo. */
export function resolveOgImageUrl(
  seo?: SEO | null,
  fallbackImage?: string,
): string {
  return resolveSeoImageUrl(seo) ?? fallbackImage ?? DEFAULT_OG_IMAGE_PATH
}

function defaultSocialImages(image: string): Pick<Metadata, 'openGraph' | 'twitter'> {
  return {
    openGraph: { images: [image] },
    twitter: { card: 'summary_large_image', images: [image] },
  }
}

export function resolveSeoTitle(seo?: SEO | null, fallback?: string): string | undefined {
  const value = seo?.metaTitle?.trim() || fallback?.trim()
  return value || undefined
}

export function resolveSeoDescription(seo?: SEO | null, fallback?: string): string | undefined {
  const value = seo?.metaDescription?.trim() || fallback?.trim()
  return value || undefined
}

/** Robots directive for private/utility routes that should not be indexed. */
export const NOINDEX_ROBOTS: Metadata['robots'] = {
  index: false,
  follow: false,
}

function resolveRobots(seo?: SEO | null): Metadata['robots'] | undefined {
  if (isNoIndexSite() || seo?.noIndex) return NOINDEX_ROBOTS
  return undefined
}

function resolveCanonical(path?: string): string | undefined {
  if (!path?.trim()) return undefined
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${getSiteOrigin()}${normalized}`
}

/** Metadata for utility routes that should not appear in search results. */
export function noIndexMetadata(title: string, description?: string): Metadata {
  const social = defaultSocialImages(DEFAULT_OG_IMAGE_PATH)
  return {
    title,
    ...(description && { description }),
    robots: NOINDEX_ROBOTS,
    ...social,
    openGraph: {
      ...social.openGraph,
      ...(title && { title }),
      ...(description && { description }),
    },
    twitter: {
      ...social.twitter,
      ...(title && { title }),
      ...(description && { description }),
    },
  }
}

/** Root layout defaults — sets metadataBase for relative OG URLs. */
export function buildSiteMetadata(defaults: Metadata = {}): Metadata {
  const social = defaultSocialImages(DEFAULT_OG_IMAGE_PATH)
  return {
    metadataBase: new URL(getSiteOrigin()),
    ...defaults,
    openGraph: {
      siteName: 'Vrije Academie',
      locale: 'nl_NL',
      type: 'website',
      ...social.openGraph,
      ...defaults.openGraph,
      images: defaults.openGraph?.images ?? social.openGraph?.images,
    },
    twitter: {
      ...social.twitter,
      ...defaults.twitter,
      images: defaults.twitter?.images ?? defaults.openGraph?.images ?? social.twitter?.images,
    },
    ...(isNoIndexSite() && { robots: NOINDEX_ROBOTS }),
  }
}

export function buildSeoMetadata(
  seo: SEO | null | undefined,
  options: {
    fallbackTitle?: string
    fallbackDescription?: string
    fallbackImage?: string
    path?: string
  } = {}
): Metadata {
  const title = resolveSeoTitle(seo, options.fallbackTitle)
  const description = resolveSeoDescription(seo, options.fallbackDescription)
  const ogImage = resolveOgImageUrl(seo, options.fallbackImage)
  const robots = resolveRobots(seo)
  const canonical = resolveCanonical(options.path)

  return {
    ...(title && { title }),
    ...(description && { description }),
    ...(robots && { robots }),
    ...(canonical && { alternates: { canonical } }),
    openGraph: {
      ...(title && { title }),
      ...(description && { description }),
      ...(canonical && { url: canonical }),
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      ...(title && { title }),
      ...(description && { description }),
      images: [ogImage],
    },
  }
}

export interface ProductSeoSource {
  seo?: SEO | null
  seoTitle?: string | null
  seoDescription?: string | null
}

export function buildProductPdpMetadata(
  source: ProductSeoSource | null | undefined,
  event: {
    title: string
    description?: string | null
    image_urls?: string[]
    thumbnail?: string | null
  },
  titleSuffix: string,
  path?: string,
  options?: { robots?: Metadata['robots'] }
): Metadata {
  const mirrorTitle = source?.seoTitle?.trim()
  const mirrorDescription = source?.seoDescription?.trim()
  const fallbackTitle = mirrorTitle
    ? `${mirrorTitle} | ${titleSuffix}`
    : `${event.title} | ${titleSuffix}`
  const fallbackDescription =
    mirrorDescription ?? event.description?.slice(0, 160) ?? undefined
  const fallbackImage = event.image_urls?.[0] ?? event.thumbnail ?? undefined

  const meta = buildSeoMetadata(source?.seo, {
    fallbackTitle,
    fallbackDescription,
    fallbackImage,
    path,
  })

  if (options?.robots) {
    return { ...meta, robots: options.robots }
  }
  return meta
}
