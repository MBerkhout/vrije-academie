/** PLP filter/badge product types (Salesforce record types mirrored on Medusa `product.type`). */
export const PLP_PRODUCT_TYPE_SLUGS = ["reis", "studiedag", "wandeling", "workshop"] as const

export type PlpProductTypeSlug = (typeof PLP_PRODUCT_TYPE_SLUGS)[number]

const SLUG_SET = new Set<string>(PLP_PRODUCT_TYPE_SLUGS)

export function productTypeToSlug(value: string | null | undefined): PlpProductTypeSlug | null {
  if (!value?.trim()) return null
  const slug = value.trim().toLowerCase()
  return SLUG_SET.has(slug) ? (slug as PlpProductTypeSlug) : null
}

export function productTypeMatchesFilter(
  typeValue: string | null | undefined,
  filterSlugs: string[]
): boolean {
  if (!filterSlugs.length) return true
  const slug = productTypeToSlug(typeValue)
  if (!slug) return false
  return filterSlugs.some((f) => f.toLowerCase() === slug)
}
