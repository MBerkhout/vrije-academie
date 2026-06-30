import { plpCategoryHref } from '@/lib/routes'

/**
 * Site search GROQ for `/zoeken` and quick suggestions. Keeps matchers in one place.
 */

/** Build a case-insensitive glob for GROQ `match` (metacharacters stripped). */
export function searchGlobPattern(query: string): string | null {
  const t = query.trim().toLowerCase()
  if (!t) return null
  const escaped = t.replace(/[\\*?\[\]]/g, '').trim()
  if (!escaped) return null
  return `*${escaped}*`
}

const SEARCH_MATCHERS = `
  (
    (_type == "page" && defined(slug.current) && (
      lower(title) match $pat ||
      lower(slug.current) match $pat ||
      (defined(seo.metaDescription) && lower(seo.metaDescription) match $pat)
    )) ||
    (_type == "product" && defined(handle) && handle != "" && (
      lower(title) match $pat ||
      lower(handle) match $pat ||
      (defined(description) && lower(description) match $pat) ||
      count(coalesce(tags, [])[lower(@) match $pat]) > 0 ||
      (count(coalesce(body, [])) > 0 && defined(pt::text(body)) && lower(pt::text(body)) match $pat)
    )) ||
    (_type == "docent" && defined(slug) && (
      lower(name) match $pat ||
      lower(slug) match $pat ||
      (defined(role) && lower(role) match $pat) ||
      (defined(bio) && lower(bio) match $pat) ||
      count(coalesce(subjectTags, [])[lower(@) match $pat]) > 0
    )) ||
    (_type == "category" && defined(slug) && (
      lower(label) match $pat ||
      lower(slug) match $pat ||
      (defined(title) && lower(title) match $pat) ||
      (defined(description) && lower(description) match $pat) ||
      (defined(seo.metaTitle) && lower(seo.metaTitle) match $pat) ||
      (defined(seo.metaDescription) && lower(seo.metaDescription) match $pat)
    )) ||
    (_type == "city" && defined(slug) && (
      lower(label) match $pat ||
      lower(slug) match $pat
    )) ||
    (_type == "person" && defined(profileUrl) && (
      lower(name) match $pat ||
      (defined(role) && lower(role) match $pat) ||
      (defined(bio) && lower(bio) match $pat) ||
      count(coalesce(subjectTags, [])[lower(@) match $pat]) > 0
    ))
  )
`

const SEARCH_PROJECTION = `{
  _type,
  _id,
  "title": select(
    _type == "page" => title,
    _type == "product" => title,
    _type == "docent" => name,
    _type == "category" => coalesce(title, label),
    _type == "city" => label,
    _type == "person" => name
  ),
  "pageSlug": select(_type == "page" => slug.current),
  "handle": select(_type == "product" => handle),
  "docentSlug": select(_type == "docent" => slug),
  "categorySlug": select(_type == "category" => slug),
  "citySlug": select(_type == "city" => slug),
  "seoDescription": select(_type == "page" => seo.metaDescription),
  "description": select(_type == "product" => description),
  "role": select((_type == "docent" || _type == "person") => role),
  "linkUrl": select(_type == "category" => linkUrl),
  "categoryDescription": select(_type == "category" => description),
  "categoryThumbnailUrl": select(_type == "category" => coalesce(image.asset->url, imageUrl)),
  "profileUrl": select(_type == "person" => profileUrl),
  "recordType": select(_type == "product" => recordType),
  "thumbnailUrl": select(_type == "product" => thumbnailUrl)
}`

/**
 * Unified full-site search: pages, products, docenten, categories, cities, editorial persons.
 * Ordering: title/name A–Z; cap 25 rows.
 */
export const SITE_SEARCH_QUERY = `*[
  _type in ["page", "product", "docent", "category", "city", "person"] &&
  ${SEARCH_MATCHERS}
] ${SEARCH_PROJECTION} | order(lower(title) asc) [0...24]`

/** Quick suggest: same matchers, higher cap; grouped in application code. */
export const SUGGEST_SEARCH_QUERY = `*[
  _type in ["page", "product", "category", "city"] &&
  ${SEARCH_MATCHERS}
] ${SEARCH_PROJECTION} | order(lower(title) asc) [0...32]`

export type SiteSearchRow = {
  _type: 'page' | 'product' | 'docent' | 'category' | 'city' | 'person'
  _id: string
  title: string | null
  pageSlug?: string | null
  handle?: string | null
  docentSlug?: string | null
  categorySlug?: string | null
  citySlug?: string | null
  seoDescription?: string | null
  description?: string | null
  role?: string | null
  linkUrl?: string | null
  categoryDescription?: string | null
  categoryThumbnailUrl?: string | null
  profileUrl?: string | null
  recordType?: string | null
  thumbnailUrl?: string | null
}

export type SearchSuggestion = {
  kind: 'product' | 'category' | 'place' | 'page'
  title: string
  href: string
  subtitle?: string
  thumbnailUrl?: string
}

export type SearchSuggestionsResult = {
  products: SearchSuggestion[]
  categories: SearchSuggestion[]
  places: SearchSuggestion[]
  pages: SearchSuggestion[]
}

export const SUGGEST_LIMITS = {
  products: 6,
  categories: 4,
  places: 4,
  pages: 4,
} as const

export function groupSuggestRows(rows: SiteSearchRow[]): SearchSuggestionsResult {
  const out: SearchSuggestionsResult = {
    products: [],
    categories: [],
    places: [],
    pages: [],
  }

  for (const row of rows) {
    if (row._type === 'product' && out.products.length < SUGGEST_LIMITS.products) {
      const handle = row.handle?.trim()
      if (!handle || !row.title?.trim()) continue
      out.products.push({
        kind: 'product',
        title: row.title.trim(),
        href: `/ons-aanbod/${handle}`,
        subtitle: row.recordType?.trim() || 'Activiteit',
        thumbnailUrl: row.thumbnailUrl ?? undefined,
      })
    } else if (row._type === 'category' && out.categories.length < SUGGEST_LIMITS.categories) {
      const slug = row.categorySlug?.trim()
      if (!slug || !row.title?.trim()) continue
      out.categories.push({
        kind: 'category',
        title: row.title.trim(),
        href: plpCategoryHref(slug),
        subtitle: 'Categorie',
        thumbnailUrl: row.categoryThumbnailUrl ?? undefined,
      })
    } else if (row._type === 'city' && out.places.length < SUGGEST_LIMITS.places) {
      const slug = row.citySlug?.trim()
      if (!slug || !row.title?.trim()) continue
      out.places.push({
        kind: 'place',
        title: row.title.trim(),
        href: `/ons-aanbod/plaats/${encodeURIComponent(slug)}`,
        subtitle: 'Plaats',
      })
    } else if (row._type === 'page' && out.pages.length < SUGGEST_LIMITS.pages) {
      const slug = row.pageSlug
      if (slug == null || slug === '' || !row.title?.trim()) continue
      const href = slug === '/' ? '/' : slug.startsWith('/') ? slug : `/${slug}`
      out.pages.push({
        kind: 'page',
        title: row.title.trim(),
        href,
        subtitle: 'Pagina',
      })
    }
  }

  return out
}

export type PlaceSuggestRow = {
  title: string
  slug: string
}

/** All canonical cities for empty-state / focus suggestions. */
export const PLACES_LIST_QUERY = `*[_type == "city" && defined(slug)] | order(sortOrder asc, lower(label) asc) [0...12] {
  "title": label,
  "slug": slug
}`

/** Filtered city list for autocomplete. */
export const PLACES_MATCH_QUERY = `*[_type == "city" && defined(slug) && (
  lower(label) match $pat || lower(slug) match $pat
)] | order(lower(label) asc) [0...10] {
  "title": label,
  "slug": slug
}`

export function placeRowToSuggestion(row: PlaceSuggestRow): SearchSuggestion {
  return {
    kind: 'place',
    title: row.title,
    href: `/ons-aanbod/plaats/${encodeURIComponent(row.slug)}`,
    subtitle: 'Plaats',
  }
}
