import {
  buildProductMirrorDoc,
  sanityProductDocId,
  type MirrorProductInput,
} from "./build-product-doc"
import {
  isSanityConfigured,
  sanityCreateOrReplace,
  sanityDelete,
  sanityFetch,
} from "./sanity-client"

export type { MirrorProductInput } from "./build-product-doc"

export async function getDocSyncStatus(
  sanityId: string
): Promise<{ lastSyncedAt: string | null }> {
  if (!isSanityConfigured()) {
    return { lastSyncedAt: null }
  }
  try {
    const doc = await sanityFetch<{ _updatedAt?: string } | null>(
      `*[_id == $id][0]{ _updatedAt }`,
      { id: sanityId }
    )
    return { lastSyncedAt: doc?._updatedAt ?? null }
  } catch {
    return { lastSyncedAt: null }
  }
}

export async function upsertDoc(doc: Record<string, unknown>): Promise<void> {
  await sanityCreateOrReplace(doc)
}

export async function deleteDoc(id: string): Promise<void> {
  await sanityDelete(id)
}

type ExistingProductEditorial = {
  body?: unknown[]
  pageBodyOwnedBySanity?: boolean
  onlineBadge?: unknown
  customUrgencyMessage?: string | null
  relatedProducts?: unknown[]
}

export async function mirrorProduct(product: MirrorProductInput): Promise<void> {
  const id = sanityProductDocId(product.id)

  const existing = await sanityFetch<ExistingProductEditorial | null>(
    `*[_id == $id][0]{ body, pageBodyOwnedBySanity, onlineBadge, customUrgencyMessage, relatedProducts }`,
    { id }
  )

  const doc = buildProductMirrorDoc(product, existing)
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

type ExistingCategoryEditorial = {
  image?: unknown
  linkUrl?: string | null
  title?: string | null
  description?: string | null
  seo?: unknown
}

export async function mirrorCategory(category: MirrorCategoryInput): Promise<void> {
  const id = `medusa-category-${category.id}`

  const existing = await sanityFetch<ExistingCategoryEditorial | null>(
    `*[_id == $id][0]{ image, linkUrl, title, description, seo }`,
    { id }
  )

  const doc: Record<string, unknown> = {
    _id: id,
    _type: "category",
    medusaId: category.id,
    slug: category.slug,
    label: category.label,
    sortOrder: category.sort_order ?? 0,
    imageUrl: category.image_url ?? null,
    color: category.color ?? null,
  }

  if (existing?.image) {
    doc.image = existing.image
  }
  if (existing?.linkUrl) {
    doc.linkUrl = existing.linkUrl
  }
  if (existing?.title) {
    doc.title = existing.title
  }
  if (existing?.description) {
    doc.description = existing.description
  }
  if (existing?.seo) {
    doc.seo = existing.seo
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

// Re-export for callers that need the client directly
export { getSanityClient, isSanityConfigured } from "./sanity-client"
