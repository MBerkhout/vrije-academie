import type { Metadata } from 'next'
import { getSiteOrigin } from '@/lib/json-ld'
import type { SEO } from './types'

export function resolveSeoImageUrl(seo?: SEO | null): string | undefined {
  return seo?.metaImage?.asset?.url
}

export function resolveSeoTitle(seo?: SEO | null, fallback?: string): string | undefined {
  const value = seo?.metaTitle?.trim() || fallback?.trim()
  return value || undefined
}

export function resolveSeoDescription(seo?: SEO | null, fallback?: string): string | undefined {
  const value = seo?.metaDescription?.trim() || fallback?.trim()
  return value || undefined
}

function resolveRobots(seo?: SEO | null): Metadata['robots'] | undefined {
  if (!seo?.noIndex) return undefined
  return { index: false, follow: false }
}

function resolveCanonical(path?: string): string | undefined {
  if (!path?.trim()) return undefined
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${getSiteOrigin()}${normalized}`
}

/** Robots directive for private/utility routes that should not be indexed. */
export const NOINDEX_ROBOTS: Metadata['robots'] = {
  index: false,
  follow: false,
}

/** Metadata for utility routes that should not appear in search results. */
export function noIndexMetadata(title: string, description?: string): Metadata {
  return {
    title,
    ...(description && { description }),
    robots: NOINDEX_ROBOTS,
  }
}

/** Root layout defaults — sets metadataBase for relative OG URLs. */
export function buildSiteMetadata(defaults: Metadata = {}): Metadata {
  return {
    metadataBase: new URL(getSiteOrigin()),
    ...defaults,
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
  const ogImage = resolveSeoImageUrl(seo) ?? options.fallbackImage
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
      ...(ogImage && { images: [ogImage] }),
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
  path?: string
): Metadata {
  const mirrorTitle = source?.seoTitle?.trim()
  const mirrorDescription = source?.seoDescription?.trim()
  const fallbackTitle = mirrorTitle
    ? `${mirrorTitle} | ${titleSuffix}`
    : `${event.title} | ${titleSuffix}`
  const fallbackDescription =
    mirrorDescription ?? event.description?.slice(0, 160) ?? undefined
  const fallbackImage = event.image_urls?.[0] ?? event.thumbnail ?? undefined

  return buildSeoMetadata(source?.seo, {
    fallbackTitle,
    fallbackDescription,
    fallbackImage,
    path,
  })
}
