import { pushEvent } from '@/lib/analytics/data-layer'
import { absolutizeUrl } from '@/lib/json-ld'
import { resolvePageType } from '@/lib/analytics/page-types'
import type { PageType } from '@/lib/analytics/types'

export function trackPageView(options?: {
  pathname?: string
  pageTitle?: string
  pageReferrer?: string
  pageType?: PageType
}): void {
  if (typeof window === 'undefined') return
  const pathname = options?.pathname ?? window.location.pathname
  pushEvent({
    event: 'page_view',
    page_location: absolutizeUrl(pathname + window.location.search),
    page_title: options?.pageTitle ?? document.title,
    page_referrer: options?.pageReferrer ?? document.referrer,
    page_type: options?.pageType ?? resolvePageType(pathname),
  })
}
