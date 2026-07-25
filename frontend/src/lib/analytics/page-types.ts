import {
  PLP_BASE_PATH,
  PLP_PATH_SEGMENT,
  THANK_YOU_PATH,
  VATHUIS_BASE_PATH,
  VATHUIS_CATALOG_PATH,
} from '@/lib/routes'
import type { PageType } from '@/lib/analytics/types'

/** Map pathname to custom `page_type` for GTM/GA4 grouping. */
export function resolvePageType(pathname: string): PageType {
  const path = pathname.split('?')[0]?.replace(/\/$/, '') || '/'

  if (path === '' || path === '/') return 'home'
  if (path === '/winkelwagen') return 'mand'
  if (path === THANK_YOU_PATH || path.startsWith('/checkout/bevestiging')) return 'bevestiging'
  if (path.startsWith('/checkout') || path.startsWith('/afrekenen')) return 'inschrijven'
  if (path.startsWith('/mijn-account')) return 'account'
  if (path === '/cadeaubon' || path.startsWith('/cadeaubon/')) return 'cadeaubon'
  if (path.startsWith(VATHUIS_BASE_PATH)) return 'vathuis'
  if (path === PLP_BASE_PATH || path.startsWith(`${PLP_BASE_PATH}/`)) {
    const segments = path.slice(PLP_BASE_PATH.length + 1).split('/').filter(Boolean)
    if (segments.length === 0 || segments[0] === 'plaats') return 'aanbod_overzicht'
    // Single segment may be category or PDP; PDP pages pass explicit page_type override.
    if (segments.length === 1) return 'aanbod_overzicht'
    return 'aanbod_overzicht'
  }
  if (path === '/agenda' || path.startsWith('/agenda/')) return 'aanbod_overzicht'
  if (path === VATHUIS_CATALOG_PATH || path.startsWith(`${VATHUIS_CATALOG_PATH}`)) return 'vathuis'
  if (path === '/zoeken') return 'aanbod_overzicht'
  return 'overig'
}

/** Build a stable list id from PLP filter context. */
export function plpListIdFromPath(pathname: string, categorySlug?: string | null): string {
  if (categorySlug?.trim()) return `aanbod_${categorySlug.trim().toLowerCase()}`
  const path = pathname.split('?')[0] ?? ''
  if (path === PLP_BASE_PATH) return 'aanbod_alle'
  if (path.startsWith(`${PLP_BASE_PATH}/plaats/`)) {
    const city = path.split('/').pop()
    return city ? `aanbod_plaats_${city}` : 'aanbod_plaats'
  }
  const segment = path.replace(`${PLP_BASE_PATH}/`, '').split('/')[0]
  if (segment && segment !== PLP_PATH_SEGMENT) return `aanbod_${segment}`
  return 'aanbod_alle'
}
