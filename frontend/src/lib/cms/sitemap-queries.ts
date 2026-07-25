import { sanityPreviewClient } from './sanity-preview-client'
import {
  PLP_BASE_PATH,
  VATHUIS_BASE_PATH,
  VATHUIS_CATALOG_PATH,
  plpCategoryHref,
  plpCityHref,
  plpProductTypeHref,
  productDetailPath,
} from '@/lib/routes'
import { PLP_PRODUCT_TYPES } from '@/lib/plp-product-types'

const staticClient = sanityPreviewClient.withConfig({ useCdn: true, stega: { enabled: false } })

export interface SitemapEntry {
  path: string
  lastModified?: Date
}

interface SitemapPageRow {
  slug: string
  isVaThuis?: boolean
  noIndex?: boolean
  _updatedAt?: string
}

interface SitemapCategoryRow {
  slug: string
  noIndex?: boolean
  _updatedAt?: string
}

interface SitemapProductRow {
  handle: string
  recordType?: string | null
  noIndex?: boolean
  _updatedAt?: string
}

interface SitemapCityRow {
  slug: string
  noIndex?: boolean
  _updatedAt?: string
}

const SITEMAP_PAGES_QUERY = `*[_type == "page" && defined(slug.current) && slug.current != ""] {
  "slug": slug.current,
  isVaThuis,
  "noIndex": seo.noIndex,
  _updatedAt
}`

const SITEMAP_CATEGORIES_QUERY = `*[_type == "category" && defined(slug) && slug != ""] {
  slug,
  "noIndex": seo.noIndex,
  _updatedAt
}`

const SITEMAP_PRODUCTS_QUERY = `*[_type == "product" && defined(handle) && handle != ""] {
  handle,
  recordType,
  "noIndex": seo.noIndex,
  _updatedAt
}`

const SITEMAP_CITIES_QUERY = `*[_type == "city" && defined(slug) && slug != ""] {
  slug,
  "noIndex": seo.noIndex,
  _updatedAt
}`

function pagePath(row: SitemapPageRow): string {
  const slug = row.slug.replace(/^\/+/, '')
  if (!slug || slug === '/') return '/'
  if (row.isVaThuis || slug.startsWith('va-thuis')) {
    return slug.startsWith('va-thuis') ? `/${slug}` : `${VATHUIS_BASE_PATH}/${slug}`
  }
  return `/${slug}`
}

function toDate(iso?: string): Date | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function staticEntries(): SitemapEntry[] {
  const paths = [
    '/',
    PLP_BASE_PATH,
    '/agenda',
    VATHUIS_BASE_PATH,
    VATHUIS_CATALOG_PATH,
    ...PLP_PRODUCT_TYPES.map((t) => plpProductTypeHref(t.slug)),
  ]
  return paths.map((path) => ({ path }))
}

export async function fetchSitemapEntries(): Promise<SitemapEntry[]> {
  const [pages, categories, products, cities] = await Promise.all([
    staticClient.fetch<SitemapPageRow[]>(SITEMAP_PAGES_QUERY),
    staticClient.fetch<SitemapCategoryRow[]>(SITEMAP_CATEGORIES_QUERY),
    staticClient.fetch<SitemapProductRow[]>(SITEMAP_PRODUCTS_QUERY),
    staticClient.fetch<SitemapCityRow[]>(SITEMAP_CITIES_QUERY),
  ])

  const entries: SitemapEntry[] = [...staticEntries()]
  const seen = new Set(entries.map((e) => e.path))

  for (const row of pages ?? []) {
    if (row.noIndex) continue
    const path = pagePath(row)
    if (seen.has(path)) continue
    seen.add(path)
    entries.push({ path, lastModified: toDate(row._updatedAt) })
  }

  for (const row of categories ?? []) {
    if (row.noIndex || !row.slug) continue
    const path = plpCategoryHref(row.slug)
    if (seen.has(path)) continue
    seen.add(path)
    entries.push({ path, lastModified: toDate(row._updatedAt) })
  }

  for (const row of products ?? []) {
    if (row.noIndex || !row.handle) continue
    const path = productDetailPath(row.handle, {
      recordType: row.recordType,
      purchaseMode: row.recordType === 'vathuis' ? 'bundle_only' : undefined,
    })
    if (seen.has(path)) continue
    seen.add(path)
    entries.push({ path, lastModified: toDate(row._updatedAt) })
  }

  for (const row of cities ?? []) {
    if (row.noIndex || !row.slug) continue
    const path = plpCityHref(row.slug)
    if (seen.has(path)) continue
    seen.add(path)
    entries.push({ path, lastModified: toDate(row._updatedAt) })
  }

  return entries
}
