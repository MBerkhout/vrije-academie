import { VATHUIS_PATH_SEGMENT } from "../constants/storefront-paths"

/** Reserved storefront catalog path segment under VA Thuis. */
export const VATHUIS_RESERVED_SLUG = `${VATHUIS_PATH_SEGMENT}/ons-aanbod`

export function pageSlugValidationMessage(
  slug: string | undefined,
  isVaThuis: boolean | undefined,
): string | true {
  if (!slug) return true

  const vaThuisPrefix =
    slug === VATHUIS_PATH_SEGMENT || slug.startsWith(`${VATHUIS_PATH_SEGMENT}/`)

  if (isVaThuis) {
    if (!vaThuisPrefix) {
      return `VA Thuis pages must have a slug starting with "${VATHUIS_PATH_SEGMENT}" (e.g. "${VATHUIS_PATH_SEGMENT}" or "${VATHUIS_PATH_SEGMENT}/about")`
    }
    if (slug === VATHUIS_RESERVED_SLUG || slug.startsWith(`${VATHUIS_RESERVED_SLUG}/`)) {
      return `Slug "${VATHUIS_RESERVED_SLUG}" is reserved for the catalog route`
    }
    return true
  }

  if (vaThuisPrefix) {
    return `Slug cannot use the "${VATHUIS_PATH_SEGMENT}" prefix unless "VA Thuis page" is enabled`
  }

  return true
}
