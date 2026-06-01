/**
 * Storefront path constants. PLP segment must match `app/(main)/ons-aanbod` in the App Router.
 * Sanity schema defaults use the same values in `sanity/src/constants/storefront-paths.ts` — keep in sync.
 */
export const PLP_PATH_SEGMENT = 'ons-aanbod' as const

/** Product listing (PLP) base path, e.g. `/ons-aanbod`. */
export const PLP_BASE_PATH = `/${PLP_PATH_SEGMENT}` as const

/** PDP URL path for a product handle (leading slash, no origin). */
export function plpProductPath(handle: string): string {
  return `${PLP_BASE_PATH}/${handle}`
}

/** Category PLP landing page, e.g. `/ons-aanbod/kunst`. */
export function plpCategoryHref(categorySlug: string): string {
  return `${PLP_BASE_PATH}/${encodeURIComponent(categorySlug)}`
}

/** PLP city landing page, e.g. `/ons-aanbod/plaats/amsterdam`. */
export function plpCityHref(citySlug: string): string {
  return `${PLP_BASE_PATH}/plaats/${encodeURIComponent(citySlug)}`
}

/** Product-type PLP landing page, e.g. `/ons-aanbod/wandeling`. */
export function plpProductTypeHref(typeSlug: string): string {
  return `${PLP_BASE_PATH}/${encodeURIComponent(typeSlug)}`
}
