export type SearchDocKind = "product" | "docent" | "category" | "city" | "page" | "person"

/** Document stored in the unified OpenSearch index. */
export type SearchDocument = {
  /** Stable index id, e.g. `product-{medusaId}` or `sanity-page-{sanityId}`. */
  id: string
  kind: SearchDocKind
  title: string
  subtitle?: string | null
  handle?: string | null
  url: string
  body?: string | null
  excerpt?: string | null
  category_labels?: string[]
  docent_names?: string[]
  city_labels?: string[]
  location_names?: string[]
  tags?: string[]
  record_type?: string | null
  product_type?: string | null
  thumbnail_url?: string | null
  /** Medusa product id when kind === product (for PLP filtering). */
  product_id?: string | null
  /** Product has at least one bookable future activity (quick-search filter). */
  has_future_activity?: boolean | null
}

export type SearchHit = {
  id: string
  kind: SearchDocKind
  title: string
  subtitle?: string
  href: string
  excerpt?: string
  thumbnailUrl?: string
}

export type SearchSuggestionsResult = {
  products: SearchHit[]
  categories: SearchHit[]
  places: SearchHit[]
  pages: SearchHit[]
}

export type SiteSearchResult = {
  hits: SearchHit[]
  count: number
}

export const SUGGEST_LIMITS = {
  products: 6,
  categories: 4,
  places: 4,
  pages: 4,
} as const
