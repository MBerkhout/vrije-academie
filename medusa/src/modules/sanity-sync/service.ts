import { createClient } from "@sanity/client"

import { descriptionToPdpBody } from "./description-to-pdp-body"

/**
 * Sanity sync service.
 * Provides helpers to upsert and delete mirrored documents.
 * All writes use a deterministic `_id = medusa-<entity>-<id>` to be idempotent.
 */
function getSanityClient() {
  const projectId = process.env.SANITY_PROJECT_ID
  const dataset = process.env.SANITY_DATASET ?? "production"
  const token = process.env.SANITY_WRITE_TOKEN

  if (!projectId || !token) {
    throw new Error("SANITY_PROJECT_ID and SANITY_WRITE_TOKEN must be set for Sanity sync")
  }

  return createClient({
    projectId,
    dataset,
    token,
    apiVersion: "2024-01-01",
    useCdn: false,
  })
}

export async function getDocSyncStatus(
  sanityId: string
): Promise<{ lastSyncedAt: string | null }> {
  try {
    const client = getSanityClient()
    const doc = await client.fetch<{ _updatedAt?: string } | null>(
      `*[_id == $id][0]{ _updatedAt }`,
      { id: sanityId }
    )
    return { lastSyncedAt: doc?._updatedAt ?? null }
  } catch {
    return { lastSyncedAt: null }
  }
}

export async function upsertDoc(doc: Record<string, unknown>): Promise<void> {
  const client = getSanityClient()
  await client.createOrReplace(doc as any)
}

export async function deleteDoc(id: string): Promise<void> {
  const client = getSanityClient()
  await client.delete(id)
}

type MirrorProductInput = {
  id: string
  handle: string
  title: string
  record_type?: string
  thumbnail?: string | null
  image_urls?: string[]
  description?: string | null
  tags?: { value: string }[]
  categories?: { id: string; slug: string; label: string }[]
  docenten?: { id: string; slug: string; name: string }[]
  has_free_trial?: boolean
  price_from?: number | null
  cities?: string[]
  earliest_start_at?: string | null
  badge?: string | null
  seo_title?: string | null
  seo_description?: string | null
  external_registration_url?: string | null
  /** Extra PDP body blocks from Salesforce import (when Sanity does not own body). */
  imported_body_blocks?: Record<string, unknown>[]
}

type ExistingProductEditorial = {
  body?: unknown[]
  pageBodyOwnedBySanity?: boolean
  onlineBadge?: unknown
  customUrgencyMessage?: string | null
  relatedProducts?: unknown[]
}

export async function mirrorProduct(product: MirrorProductInput): Promise<void> {
  const client = getSanityClient()
  const id = `medusa-product-${product.id}`

  const existing = await client.fetch<ExistingProductEditorial | null>(
    `*[_id == $id][0]{ body, pageBodyOwnedBySanity, onlineBadge, customUrgencyMessage, relatedProducts }`,
    { id }
  )

  const mirrorFields = {
    medusaId: product.id,
    handle: product.handle,
    title: product.title,
    recordType: product.record_type ?? null,
    thumbnailUrl: product.thumbnail ?? null,
    imageUrls: product.image_urls ?? [],
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
    seoTitle: product.seo_title ?? null,
    seoDescription: product.seo_description ?? null,
    externalRegistrationUrl: product.external_registration_url ?? null,
  }

  const owned = existing?.pageBodyOwnedBySanity === true
  const bodyFromDescription = descriptionToPdpBody(product.description)
  const importedBlocks = product.imported_body_blocks ?? []
  const mergedBody =
    importedBlocks.length > 0 ? importedBlocks : bodyFromDescription

  const doc: Record<string, unknown> = {
    _id: id,
    _type: "product",
    ...mirrorFields,
    pageBodyOwnedBySanity: existing?.pageBodyOwnedBySanity === true,
    onlineBadge: existing?.onlineBadge ?? null,
    customUrgencyMessage: existing?.customUrgencyMessage ?? null,
    relatedProducts: existing?.relatedProducts ?? [],
    body: owned ? (existing?.body ?? []) : mergedBody,
  }

  await upsertDoc(doc)
}

type MirrorCategoryInput = {
  id: string
  slug: string
  label: string
  sort_order?: number
  image_url?: string | null
  color?: string | null
}

export async function mirrorCategory(category: MirrorCategoryInput): Promise<void> {
  const doc = {
    _id: `medusa-category-${category.id}`,
    _type: "category",
    medusaId: category.id,
    slug: category.slug,
    label: category.label,
    sortOrder: category.sort_order ?? 0,
    imageUrl: category.image_url ?? null,
    color: category.color ?? null,
  }
  await upsertDoc(doc)
}

type MirrorCityInput = {
  id: string
  slug: string
  label: string
  sort_order?: number
}

export async function mirrorCity(city: MirrorCityInput): Promise<void> {
  const doc = {
    _id: `medusa-city-${city.id}`,
    _type: "city",
    medusaId: city.id,
    slug: city.slug,
    label: city.label,
    sortOrder: city.sort_order ?? 0,
  }
  await upsertDoc(doc)
}

type MirrorDocentInput = {
  id: string
  slug: string
  name: string
  role?: string | null
  photo_url?: string | null
  bio?: string | null
  subject_tags?: string[] | null
}

export async function mirrorDocent(docent: MirrorDocentInput): Promise<void> {
  const doc = {
    _id: `medusa-docent-${docent.id}`,
    _type: "docent",
    medusaId: docent.id,
    slug: docent.slug,
    name: docent.name,
    role: docent.role ?? null,
    photoUrl: docent.photo_url ?? null,
    bio: docent.bio ?? null,
    subjectTags: docent.subject_tags ?? [],
  }
  await upsertDoc(doc)
}
