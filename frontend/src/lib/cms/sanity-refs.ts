import { cache } from 'react'
import { sanityPreviewClient } from './sanity-preview-client'
import { SEO_FIELD } from './seo-fragment'
import type { ProductSeoSource } from './seo-metadata'
import type { SEO } from './types'

/**
 * Fixed Page id for `/ons-aanbod` in Sanity. Must match `PLP_CMS_PAGE_ID` in `sanity/src/constants/storefront-paths.ts`.
 */
export const PLP_CMS_PAGE_ID = 'pageOnsAanbod' as const

/** Fixed Page id for `/va-thuis` in Sanity. Used by migration script. Must match `VATHUIS_CMS_PAGE_ID` in `sanity/src/constants/storefront-paths.ts`. */
export const VATHUIS_CMS_PAGE_ID = 'pageVaThuis' as const

/** Plain (non-live) client for stable server-side queries that don't need streaming. */
const staticClient = sanityPreviewClient.withConfig({ useCdn: true, stega: { enabled: false } })

async function staticFetch<T>(query: string, params?: Record<string, string>): Promise<T | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await staticClient.fetch<T>(query, params as any)
  } catch {
    return null
  }
}

/** Keep first occurrence per slug (query order preserved). */
function dedupeBySlug<T extends { slug: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.slug)) return false
    seen.add(item.slug)
    return true
  })
}

const PLP_BANNER = `{
  enabled,
  title,
  subtitle,
  image { asset-> { url } },
  ctaLabel,
  ctaUrl
}`

/**
 * PLP editorial content: Page `PLP_CMS_PAGE_ID` with a `plpBlock` in `blocks[]`.
 * `coalesce` still reads legacy `plpPage` until migration is run and the old document removed.
 */
export const PLP_PAGE_QUERY = `coalesce(
  *[_id == "${PLP_CMS_PAGE_ID}"][0] {
    "banner": blocks[_type == "plpBlock"][0].banner ${PLP_BANNER},
    "intro": blocks[_type == "plpBlock"][0].intro,
    "tabs": blocks[_type == "plpBlock"][0].tabs[] { label, href },
    "seo": seo
  },
  *[_id == "plpPage"][0] {
    banner ${PLP_BANNER},
    intro,
    tabs[] { label, href },
    ${SEO_FIELD}
  }
)`

/** PLP/agenda filter sidebar — slug + label only (no SEO/images). */
export const CATEGORIES_FILTER_QUERY = `*[_type == "category"] | order(sortOrder asc) {
  _id,
  slug,
  label,
  sortOrder
}`

/** All categories ordered by sortOrder (for filter sidebar) */
export const CATEGORIES_QUERY = `*[_type == "category"] | order(sortOrder asc) {
  _id,
  slug,
  label,
  title,
  description,
  sortOrder,
  color,
  imageUrl,
  image { asset-> { url } },
  linkUrl,
  ${SEO_FIELD}
}`

/** Sanity `docent` documents, ordered by name (filter sidebar teacher list). */
export const TEACHERS_QUERY = `*[_type == "docent"] | order(name asc) {
  _id,
  slug,
  name,
  role,
  photoUrl
}`

/** Single city mirror by slug (for city PLP pages). */
export const CITY_BY_SLUG_QUERY = `*[_type == "city" && slug == $slug][0] {
  _id,
  slug,
  label,
  sortOrder,
  ${SEO_FIELD}
}`

/** Single category mirror by slug (for category PLP pages). */
export const CATEGORY_BY_SLUG_QUERY = `*[_type == "category" && slug == $slug][0] {
  _id,
  slug,
  label,
  title,
  description,
  sortOrder,
  color,
  imageUrl,
  image { asset-> { url } },
  linkUrl,
  ${SEO_FIELD}
}`

export type PlpPageData = {
  banner?: {
    enabled: boolean
    title?: string
    subtitle?: string
    image?: { asset?: { url: string } }
    ctaLabel?: string
    ctaUrl?: string
  }
  intro?: unknown[]
  tabs?: { label: string; href: string }[]
  seo?: SEO
}

export type CategoryOption = {
  _id: string
  slug: string
  label: string
  title?: string | null
  description?: string | null
  sortOrder?: number
  color?: string | null
  imageUrl?: string | null
  image?: { asset?: { url: string } } | null
  linkUrl?: string | null
  seo?: SEO | null
}

/** Editorial display title; falls back to Medusa label. */
export function categoryDisplayTitle(category: Pick<CategoryOption, 'title' | 'label'>): string {
  return category.title?.trim() || category.label
}

export type TeacherOption = {
  _id: string
  slug: string
  name: string
  role?: string | null
  photoUrl?: string | null
}

export type CityOption = {
  _id: string
  slug: string
  label: string
  sortOrder?: number
  seo?: SEO | null
}

export const getPlpPage = cache(async (): Promise<PlpPageData | null> => {
  return staticFetch<PlpPageData>(PLP_PAGE_QUERY)
})

export const getCategoriesForFilter = cache(async (): Promise<CategoryOption[]> => {
  const rows = (await staticFetch<CategoryOption[]>(CATEGORIES_FILTER_QUERY)) ?? []
  return dedupeBySlug(rows)
})

export const getTeachersForFilter = cache(async (): Promise<TeacherOption[]> => {
  const rows = (await staticFetch<TeacherOption[]>(TEACHERS_QUERY)) ?? []
  return dedupeBySlug(rows)
})

export async function getCityBySlug(slug: string): Promise<CityOption | null> {
  return staticFetch<CityOption>(CITY_BY_SLUG_QUERY, { slug })
}

export async function getCategoryBySlug(slug: string): Promise<CategoryOption | null> {
  return staticFetch<CategoryOption>(CATEGORY_BY_SLUG_QUERY, { slug })
}

// ── PDP editorial extras ──────────────────────────────────────────────────────

const PT_BLOCK = `{ _type, _key, children[] { _key, _type, text, marks }, markDefs[] { _key, _type, href, buttonType, label, url }, listItem, style }`

const PDP_BLOCK_LAYOUT = `"_id": coalesce(@._id, @._key),
    "marginTop": coalesce(@.layout.marginTop, "0"),
    "marginTopCustom": @.layout.marginTopCustom,
    "marginBottom": coalesce(@.layout.marginBottom, "0"),
    "marginBottomCustom": @.layout.marginBottomCustom,
    "paddingTop": coalesce(@.layout.paddingTop, "0"),
    "paddingBottom": coalesce(@.layout.paddingBottom, "0"),
    "width": coalesce(@.layout.width, "container"),
    "backgroundColor": coalesce(@.layout.backgroundColor, "none"),
    "htmlAnchor": @.layout.htmlAnchor`

/** GROQ inline block expansion for PDP-surface blocks. */
const PDP_BODY_BLOCKS_PROJECTION = `"body": body[] {
  ...select(
    @._type == "textBlock" => {
      ...@,
      ${PDP_BLOCK_LAYOUT},
      content[] ${PT_BLOCK},
      "contentWidth": @.width
    },
    @._type == "afbeeldingBlock" => {
      ...@,
      ${PDP_BLOCK_LAYOUT},
      image { asset-> { _id, url, metadata { dimensions } }, alt },
      "contentWidth": @.width,
      aspectRatio
    },
    @._type == "columnsBlock" => {
      ...@,
      ${PDP_BLOCK_LAYOUT},
      "columns": @.columns[] {
        columnType, width, verticalAlignment,
        textTitle, textTitleSize,
        textContent[] ${PT_BLOCK},
        mediaType,
        mediaImage { asset-> { _id, url }, alt },
        mediaImageAlt, mediaYoutubeUrl, mediaCaption, mediaAspectRatio,
        highlightImage { asset-> { _id, url } }, highlightTitle, highlightTitleSize,
        highlightTeaser[] ${PT_BLOCK}, highlightLabel,
        ctaCardBgImage { asset-> { _id, url } }, ctaCardTitle, ctaCardTitleSize, ctaCardOverlay,
        ctaCardBody[] ${PT_BLOCK},
        ctaCardCtaEnabled, ctaCardCtaLabel, ctaCardCtaUrl,
        person-> { _id, name, photo { asset->{ _id, url } }, role, bio, profileUrl, personType },
        personShowBio, personShowLink
      }
    },
    @._type == "accordionBlock" => {
      ...@,
      ${PDP_BLOCK_LAYOUT},
      "items": @.items[] { question, answer[] ${PT_BLOCK} }
    },
    @._type == "tabsBlock" => {
      ...@,
      ${PDP_BLOCK_LAYOUT},
      "contentWidth": @.width
    },
    @._type == "whitespaceBlock" => {
      ...@,
      ${PDP_BLOCK_LAYOUT}
    },
    {
      ...@,
      ${PDP_BLOCK_LAYOUT}
    }
  )
}`

export type RelatedProductCard = {
  _id: string
  medusaId?: string
  handle?: string
  title?: string
  thumbnailUrl?: string
  imageUrls?: string[]
  startAt?: string
  priceFrom?: number
  recordType?: string
  cities?: string[]
  hasFreeTrial?: boolean
}

export type SanityProductExtras = {
  body?: unknown[]
  onlineBadge?: { enabled: boolean; text?: string } | null
  customUrgencyMessage?: string | null
  relatedProducts?: RelatedProductCard[]
  seo?: SEO | null
  seoTitle?: string | null
  seoDescription?: string | null
}

const PRODUCT_EXTRAS_QUERY = `*[_type == "product" && medusaId == $medusaId][0] {
  ${PDP_BODY_BLOCKS_PROJECTION},
  onlineBadge { enabled, text },
  customUrgencyMessage,
  ${SEO_FIELD},
  seoTitle,
  seoDescription,
  "relatedProducts": relatedProducts[]-> {
    _id,
    medusaId,
    handle,
    title,
    thumbnailUrl,
    imageUrls,
    startAt,
    priceFrom,
    recordType,
    cities,
    hasFreeTrial
  }
}`

export async function getSanityProductExtras(medusaId: string): Promise<SanityProductExtras | null> {
  return staticFetch<SanityProductExtras>(PRODUCT_EXTRAS_QUERY, { medusaId })
}

const PRODUCT_SEO_BY_HANDLE_QUERY = `*[_type == "product" && handle == $handle][0] {
  ${SEO_FIELD},
  seoTitle,
  seoDescription
}`

export interface ProductSeoByHandle extends ProductSeoSource {}

export async function getProductSeoByHandle(handle: string): Promise<ProductSeoByHandle | null> {
  return staticFetch<ProductSeoByHandle>(PRODUCT_SEO_BY_HANDLE_QUERY, { handle })
}
