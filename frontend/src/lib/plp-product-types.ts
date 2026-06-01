/** Salesforce-backed product types with dedicated PLP badges, filters, and landing pages. */
export const PLP_PRODUCT_TYPES = [
  { slug: 'reis', label: 'Reis', badgeClass: 'bg-va-purple text-white' },
  { slug: 'studiedag', label: 'Studiedag', badgeClass: 'bg-va-yellow text-va-black' },
  { slug: 'wandeling', label: 'Wandeling', badgeClass: 'bg-va-orange text-white' },
  { slug: 'workshop', label: 'Workshop', badgeClass: 'bg-va-black text-white' },
] as const

export type PlpProductTypeSlug = (typeof PLP_PRODUCT_TYPES)[number]['slug']

const SLUG_SET = new Set<string>(PLP_PRODUCT_TYPES.map((t) => t.slug))

const BADGE_CLASS_BY_SLUG = Object.fromEntries(
  PLP_PRODUCT_TYPES.map((t) => [t.slug, t.badgeClass])
) as Record<PlpProductTypeSlug, string>

const LABEL_BY_SLUG = Object.fromEntries(
  PLP_PRODUCT_TYPES.map((t) => [t.slug, t.label])
) as Record<PlpProductTypeSlug, string>

export function isPlpProductTypeSlug(slug: string): slug is PlpProductTypeSlug {
  return SLUG_SET.has(slug.toLowerCase())
}

/** Lowercase slug from Medusa `product.type.value` or URL segment. */
export function productTypeToSlug(value: string | null | undefined): PlpProductTypeSlug | null {
  if (!value?.trim()) return null
  const slug = value.trim().toLowerCase()
  return isPlpProductTypeSlug(slug) ? slug : null
}

export function productTypeLabelFromSlug(slug: string): string {
  if (isPlpProductTypeSlug(slug)) return LABEL_BY_SLUG[slug]
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

export function plpProductTypeBadgeClass(slug: PlpProductTypeSlug): string {
  return BADGE_CLASS_BY_SLUG[slug]
}

export function plpProductTypeBadgeLabel(
  productType: string | null | undefined
): string | null {
  const slug = productTypeToSlug(productType)
  if (!slug) return null
  return LABEL_BY_SLUG[slug]
}
