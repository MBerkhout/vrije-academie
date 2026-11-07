import 'server-only'

import { unstable_cache } from 'next/cache'

import {
  getCategoryBySlug as fetchCategoryBySlug,
  getProductSeoByHandle as fetchProductSeoByHandle,
  getSanityProductExtras as fetchSanityProductExtras,
  type ProductSeoByHandle,
  type SanityProductExtras,
  type CategoryOption,
} from '@/lib/cms/sanity-refs'

const PDP_SANITY_CACHE_SEC = Number(process.env.PDP_SANITY_CACHE_SEC) || 60

export const PDP_SANITY_PRODUCT_TAG = 'pdp-sanity-product'
export const PDP_SANITY_CATEGORY_TAG = 'pdp-sanity-category'

export function pdpSanityProductTag(medusaId: string): string {
  return `pdp-sanity-product:${medusaId}`
}

export function pdpSanityHandleTag(handle: string): string {
  return `pdp-sanity-handle:${handle.trim()}`
}

export function pdpSanityCategoryTag(slug: string): string {
  return `pdp-sanity-category:${slug.trim()}`
}

export async function getSharedCachedCategoryBySlug(slug: string): Promise<CategoryOption | null> {
  const safe = slug.trim()
  if (!safe) return null
  return unstable_cache(
    async () => fetchCategoryBySlug(safe),
    ['pdp-category-v1', safe],
    { revalidate: PDP_SANITY_CACHE_SEC, tags: [pdpSanityCategoryTag(safe), PDP_SANITY_CATEGORY_TAG] }
  )()
}

export async function getSharedCachedSanityProductExtras(
  medusaId: string
): Promise<SanityProductExtras | null> {
  const id = medusaId.trim()
  if (!id) return null
  return unstable_cache(
    async () => fetchSanityProductExtras(id),
    ['pdp-sanity-extras-v1', id],
    { revalidate: PDP_SANITY_CACHE_SEC, tags: [pdpSanityProductTag(id), PDP_SANITY_PRODUCT_TAG] }
  )()
}

export async function getSharedCachedProductSeoByHandle(
  handle: string
): Promise<ProductSeoByHandle | null> {
  const safe = handle.trim()
  if (!safe) return null
  return unstable_cache(
    async () => fetchProductSeoByHandle(safe),
    ['pdp-sanity-seo-v1', safe],
    { revalidate: PDP_SANITY_CACHE_SEC, tags: [pdpSanityHandleTag(safe), PDP_SANITY_PRODUCT_TAG] }
  )()
}
