/**
 * PLP path — must match `frontend/src/lib/routes.ts` (App Router: `app/(main)/ons-aanbod`).
 */
export const PLP_PATH_SEGMENT = "ons-aanbod" as const
export const PLP_BASE_PATH = `/${PLP_PATH_SEGMENT}` as const

/** Single Page document for `/ons-aanbod`; must match `PLP_CMS_PAGE_ID` in the frontend. */
export const PLP_CMS_PAGE_ID = "pageOnsAanbod" as const

/** Legacy storefront path; canonical URL is the Page slug in Sanity (`pageCadeaubon`). */
export const CADEAUBON_PATH_SEGMENT = "cadeaubon" as const
export const CADEAUBON_BASE_PATH = `/${CADEAUBON_PATH_SEGMENT}` as const

/** Page document for cadeaubon CMS content; must match `CADEAUBON_CMS_PAGE_ID` in the frontend. */
export const CADEAUBON_CMS_PAGE_ID = "pageCadeaubon" as const
