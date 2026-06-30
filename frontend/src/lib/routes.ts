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

/** Thank-you page after checkout / Mollie redirect. */
export const THANK_YOU_PATH = '/bedankt' as const

export const VATHUIS_PATH_SEGMENT = 'va-thuis' as const

/** VA Thuis base path, e.g. `/va-thuis`. */
export const VATHUIS_BASE_PATH = `/${VATHUIS_PATH_SEGMENT}` as const
export const VATHUIS_CATALOG_PATH = `${VATHUIS_BASE_PATH}/ons-aanbod` as const

/** VA Thuis PDP URL path for a product handle. */
export function vathuisProductPath(handle: string): string {
  return `${VATHUIS_BASE_PATH}/${encodeURIComponent(handle)}`
}

/** VA Thuis catalog with docent filter. */
export function vathuisTeacherHref(teacherSlug: string): string {
  return `${VATHUIS_CATALOG_PATH}?docent=${encodeURIComponent(teacherSlug)}`
}

/** Resolve product link: VA Thuis bundle → `/va-thuis/{handle}`, else Ons aanbod PDP. */
export function productDetailPath(
  handle: string,
  opts?: { purchaseMode?: string | null; recordType?: string | null }
): string {
  if (opts?.purchaseMode === 'bundle_only' || opts?.recordType === 'vathuis') {
    return vathuisProductPath(handle)
  }
  return plpProductPath(handle)
}
