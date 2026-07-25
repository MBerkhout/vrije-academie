'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/analytics/events/site-wide'
import type { PageType } from '@/lib/analytics/types'
import { usePageTypeOverride } from '@/components/analytics/PageTypeOverride'

export function PageViewTracker({ pageType }: { pageType?: PageType }) {
  const pathname = usePathname() ?? ''
  const override = usePageTypeOverride()
  const resolvedPageType = override ?? pageType
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    const key = `${pathname}|${document.title}|${pageType ?? ''}`
    if (lastKey.current === key) return
    lastKey.current = key

    const timer = window.setTimeout(() => {
      trackPageView({ pathname, pageType: resolvedPageType })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [pathname, pageType, resolvedPageType])

  return null
}
