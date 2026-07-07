import type { Metadata } from 'next'
import type { SEO } from './types'

/** Applied site-wide until public launch. */
export const SITE_ROBOTS: Metadata['robots'] = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
}

export function resolveSeoImageUrl(seo?: SEO | null): string | undefined {
  return seo?.openGraph?.image?.asset?.url ?? seo?.metaImage?.asset?.url
}

export function resolveSeoTitle(seo?: SEO | null, fallback?: string): string | undefined {
  const value = seo?.openGraph?.title?.trim() || seo?.metaTitle?.trim() || fallback?.trim()
  return value || undefined
}

export function resolveSeoDescription(seo?: SEO | null, fallback?: string): string | undefined {
  const value = seo?.openGraph?.description?.trim() || seo?.metaDescription?.trim() || fallback?.trim()
  return value || undefined
}

function resolveRobots(_seo?: SEO | null): Metadata['robots'] {
  return SITE_ROBOTS
}

export function buildSeoMetadata(
  seo: SEO | null | undefined,
  options: {
    fallbackTitle?: string
    fallbackDescription?: string
    fallbackImage?: string
    canonical?: string
  } = {}
): Metadata {
  const title = resolveSeoTitle(seo, options.fallbackTitle)
  const description = resolveSeoDescription(seo, options.fallbackDescription)
  const ogImage = resolveSeoImageUrl(seo) ?? options.fallbackImage
  return {
    ...(title && { title }),
    ...(description && { description }),
    robots: resolveRobots(seo),
    ...(options.canonical && { alternates: { canonical: options.canonical } }),
    openGraph: {
      ...(title && { title }),
      ...(description && { description }),
      ...(options.canonical && { url: options.canonical }),
      ...(ogImage && { images: [ogImage] }),
    },
  }
}

export function buildProductPdpMetadata(
  seo: SEO | null | undefined,
  event: {
    title: string
    description?: string | null
    image_urls?: string[]
    thumbnail?: string | null
  },
  titleSuffix: string
): Metadata {
  const fallbackTitle = `${event.title} | ${titleSuffix}`
  const fallbackDescription = event.description?.slice(0, 160) ?? undefined
  const fallbackImage = event.image_urls?.[0] ?? event.thumbnail ?? undefined

  return buildSeoMetadata(seo, {
    fallbackTitle,
    fallbackDescription,
    fallbackImage,
  })
}
