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

/** VA Thuis path segment and routes. */
export const VATHUIS_PATH_SEGMENT = "va-thuis" as const
export const VATHUIS_BASE_PATH = `/${VATHUIS_PATH_SEGMENT}` as const
export const VATHUIS_CATALOG_PATH = `${VATHUIS_BASE_PATH}/ons-aanbod` as const

/** Page document for VA Thuis landing; must match `VATHUIS_CMS_PAGE_ID` in the frontend. */
export const VATHUIS_CMS_PAGE_ID = "pageVaThuis" as const
