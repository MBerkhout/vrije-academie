import { descriptionToPdpBody } from "./description-to-pdp-body"
import { deepEqual } from "../salesforce-sync/utils/deep-equal"

export type MirrorProductInput = {
  id: string
  handle: string
  title: string
  record_type?: string
  thumbnail?: string | null
  image_urls?: string[]
  image_captions?: (string | null)[]
  description?: string | null
  tags?: { value: string }[]
  categories?: { id: string; slug: string; label: string }[]
  docenten?: { id: string; slug: string; name: string }[]
  has_free_trial?: boolean
  price_from?: number | null
  cities?: string[]
  earliest_start_at?: string | null
  badge?: string | null
  cta_color?: string | null
  cta_color_hover?: string | null
  seo_title?: string | null
  seo_description?: string | null
  external_registration_url?: string | null
  imported_body_blocks?: Record<string, unknown>[]
}

export type ExistingProductEditorial = {
  body?: unknown[]
  pageBodyOwnedBySanity?: boolean
  onlineBadge?: unknown
  customUrgencyMessage?: string | null
  relatedProducts?: unknown[]
}

export type ExistingSanityProductDoc = ExistingProductEditorial &
  Record<string, unknown> & {
    _id?: string
    _type?: string
  }

export function sanityProductDocId(medusaProductId: string): string {
  return `medusa-product-${medusaProductId}`
}

export function buildProductMirrorDoc(
  product: MirrorProductInput,
  existing?: ExistingProductEditorial | null
): Record<string, unknown> {
  const id = sanityProductDocId(product.id)

  const mirrorFields = {
    medusaId: product.id,
    handle: product.handle,
    title: product.title,
    recordType: product.record_type ?? null,
    thumbnailUrl: product.thumbnail ?? null,
    imageUrls: product.image_urls ?? [],
    imageCaptions: (product.image_captions ?? []).map((caption) => caption ?? ""),
    description: product.description ?? null,
    tags: (product.tags ?? []).map((t) => t.value),
    categories: (product.categories ?? []).map((c) => ({
      _key: c.id,
      _type: "reference",
      _ref: `medusa-category-${c.id}`,
    })),
    docenten: (product.docenten ?? []).map((d) => ({
      _key: d.id,
      _type: "reference",
      _ref: `medusa-docent-${d.id}`,
    })),
    hasFreeTrial: product.has_free_trial ?? false,
    priceFrom: product.price_from ?? null,
    cities: product.cities ?? [],
    startAt: product.earliest_start_at ?? null,
    badge: product.badge ?? null,
    ctaColor: product.cta_color ?? null,
    ctaColorHover: product.cta_color_hover ?? null,
    seoTitle: product.seo_title ?? null,
    seoDescription: product.seo_description ?? null,
    externalRegistrationUrl: product.external_registration_url ?? null,
  }

  const owned = existing?.pageBodyOwnedBySanity === true
  const bodyFromDescription = descriptionToPdpBody(product.description)
  const importedBlocks = product.imported_body_blocks ?? []
  const mergedBody = importedBlocks.length > 0 ? importedBlocks : bodyFromDescription

  return {
    _id: id,
    _type: "product",
    ...mirrorFields,
    pageBodyOwnedBySanity: existing?.pageBodyOwnedBySanity === true,
    onlineBadge: existing?.onlineBadge ?? null,
    customUrgencyMessage: existing?.customUrgencyMessage ?? null,
    relatedProducts: existing?.relatedProducts ?? [],
    body: owned ? (existing?.body ?? []) : mergedBody,
  }
}

/** Compare target mirror doc against an existing Sanity doc; skip write when equivalent. */
export function productMirrorDocChanged(
  target: Record<string, unknown>,
  existing: ExistingSanityProductDoc | null | undefined
): boolean {
  if (!existing) return true

  const compareKeys = [
    "medusaId",
    "handle",
    "title",
    "recordType",
    "thumbnailUrl",
    "imageUrls",
    "imageCaptions",
    "description",
    "tags",
    "categories",
    "docenten",
    "hasFreeTrial",
    "priceFrom",
    "cities",
    "startAt",
    "badge",
    "ctaColor",
    "ctaColorHover",
    "seoTitle",
    "seoDescription",
    "externalRegistrationUrl",
    "pageBodyOwnedBySanity",
    "onlineBadge",
    "customUrgencyMessage",
    "relatedProducts",
    "body",
  ] as const

  for (const key of compareKeys) {
    if (!deepEqual(target[key], existing[key])) {
      return true
    }
  }
  return false
}

export const SANITY_PRODUCT_BATCH_FETCH_FIELDS = `
  _id,
  medusaId,
  handle,
  title,
  recordType,
  thumbnailUrl,
  imageUrls,
  imageCaptions,
  description,
  tags,
  categories,
  docenten,
  hasFreeTrial,
  priceFrom,
  cities,
  startAt,
  badge,
  ctaColor,
  ctaColorHover,
  seoTitle,
  seoDescription,
  externalRegistrationUrl,
  pageBodyOwnedBySanity,
  onlineBadge,
  customUrgencyMessage,
  relatedProducts,
  body
`
