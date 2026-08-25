/**
 * Salesforce **Zichtbaar op Website**.
 * Unchecked checkboxes are `false`. Missing/null stays visible so a field
 * rollout does not hide the catalog.
 */
export function isSalesforceVisibleOnWebsite(value: unknown): boolean {
  return value !== false
}

/** Venue-rental record types / names are never public catalog sessions. */
export function isSalesforceExterneVerhuur(
  ...parts: Array<string | null | undefined>
): boolean {
  return parts.some((part) => (part ?? "").toLowerCase().includes("verhuur"))
}

/** Variant metadata written on import; `false` hides that session on the storefront. */
export const SALESFORCE_VISIBLE_ON_WEBSITE_METADATA_KEY = "salesforce_visible_on_website"

export function isStorefrontVisibleVariant(variant: {
  metadata?: Record<string, unknown> | null
}): boolean {
  return variant.metadata?.[SALESFORCE_VISIBLE_ON_WEBSITE_METADATA_KEY] !== false
}

export function filterStorefrontVisibleVariants<T extends { metadata?: Record<string, unknown> | null }>(
  variants: T[]
): T[] {
  return variants.filter(isStorefrontVisibleVariant)
}
