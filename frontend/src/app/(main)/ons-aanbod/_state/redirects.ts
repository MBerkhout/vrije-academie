import type { PlpFilterState } from './url'
import { serializeFilterState } from './url'
import { PLP_BASE_PATH, plpCategoryHref, plpProductTypeHref } from '@/lib/routes'
import { isPlpProductTypeSlug, productTypeLabelFromSlug } from '@/lib/plp-product-types'

/** Path-based category PLP, e.g. `/ons-aanbod/kunstgeschiedenis` (not city, product type, or base PLP). */
export function isCategoryScopedPlpPath(path: string): boolean {
  if (path === PLP_BASE_PATH) return false
  if (!path.startsWith(`${PLP_BASE_PATH}/`)) return false
  if (path.includes('/plaats/')) return false
  const slug = path.slice(`${PLP_BASE_PATH}/`.length).split('/')[0]
  if (isPlpProductTypeSlug(slug)) return false
  return true
}

/** Path-based product-type PLP, e.g. `/ons-aanbod/wandeling`. */
export function isProductTypeScopedPlpPath(path: string): boolean {
  if (!path.startsWith(`${PLP_BASE_PATH}/`)) return false
  if (path.includes('/plaats/')) return false
  const slug = path.slice(`${PLP_BASE_PATH}/`.length).split('/')[0]
  return isPlpProductTypeSlug(slug)
}

export function usesPlpCanonicalFilterHref(path: string): boolean {
  return (
    path === PLP_BASE_PATH ||
    isCategoryScopedPlpPath(path) ||
    isProductTypeScopedPlpPath(path)
  )
}

function hasExtraFiltersBeyondSingleScope(filterState: PlpFilterState): boolean {
  return !!(
    filterState.q ||
    filterState.teachers?.length ||
    filterState.recordTypes?.length ||
    filterState.deliveryTypes?.length ||
    filterState.cities?.length ||
    filterState.dayParts?.length ||
    filterState.periodStart ||
    filterState.periodEnd ||
    filterState.sort
  )
}

/**
 * When the base PLP has only a single category filter (no other filters), return the
 * canonical path-based URL. Preserves `page` when > 1.
 */
export function singleCategoryRedirectTarget(
  filterState: PlpFilterState,
  rawParams: Record<string, string | string[]>
): string | null {
  const categories = filterState.categories ?? []
  if (categories.length !== 1) return null
  if (filterState.productTypes?.length) return null
  if (hasExtraFiltersBeyondSingleScope(filterState)) return null

  const base = plpCategoryHref(categories[0])
  const pageRaw = rawParams.page
  const page = pageRaw == null ? 1 : Number(Array.isArray(pageRaw) ? pageRaw[0] : pageRaw)
  if (!isNaN(page) && page > 1) {
    return `${base}?page=${page}`
  }
  return base
}

/**
 * When the base PLP has only a single product-type filter (no other filters), return the
 * canonical path-based URL, e.g. `/ons-aanbod/wandeling`.
 */
export function singleProductTypeRedirectTarget(
  filterState: PlpFilterState,
  rawParams: Record<string, string | string[]>
): string | null {
  const productTypes = filterState.productTypes ?? []
  if (productTypes.length !== 1) return null
  if (filterState.categories?.length) return null
  if (hasExtraFiltersBeyondSingleScope(filterState)) return null

  const slug = productTypes[0].toLowerCase()
  if (!isPlpProductTypeSlug(slug)) return null

  const base = plpProductTypeHref(slug)
  const pageRaw = rawParams.page
  const page = pageRaw == null ? 1 : Number(Array.isArray(pageRaw) ? pageRaw[0] : pageRaw)
  if (!isNaN(page) && page > 1) {
    return `${base}?page=${page}`
  }
  return base
}

/**
 * Canonical href for PLP filter navigation: single category-only or product-type-only
 * filters use path URLs; everything else uses `/ons-aanbod?…`.
 */
export function resolvePlpFilterHref(
  filterState: PlpFilterState,
  options?: { page?: number }
): string {
  const params = serializeFilterState(filterState)
  if (options?.page && options.page > 1) {
    params.set('page', String(options.page))
  } else {
    params.delete('page')
  }

  const rawParams: Record<string, string | string[]> = {}
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key)
    rawParams[key] = all.length === 1 ? all[0] : all
  }

  const categoryCanonical = singleCategoryRedirectTarget(filterState, rawParams)
  if (categoryCanonical) return categoryCanonical

  const typeCanonical = singleProductTypeRedirectTarget(filterState, rawParams)
  if (typeCanonical) return typeCanonical

  const query = params.toString()
  return query ? `${PLP_BASE_PATH}?${query}` : PLP_BASE_PATH
}

/** Badge click: filter by product type while keeping other active filters. */
export function plpFilterHrefWithProductType(
  filterState: PlpFilterState | undefined,
  typeSlug: string
): string {
  const slug = typeSlug.toLowerCase()
  const next: PlpFilterState = {
    ...(filterState ?? {}),
    productTypes: [slug],
  }
  return resolvePlpFilterHref(next)
}

export { productTypeLabelFromSlug }
