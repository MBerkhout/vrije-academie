'use client'

import { useEffect, type ReactNode } from 'react'
import { applyConsentDefaults, initCookiebotConsentBridge } from '@/lib/analytics/consent/cookiebot'
import { initDataLayer } from '@/lib/analytics/data-layer'
import { OutboundLinkTracker } from '@/components/analytics/OutboundLinkTracker'
import { PageViewTracker } from '@/components/analytics/PageViewTracker'
import { ScrollDepthTracker } from '@/components/analytics/ScrollDepthTracker'
import { CheckoutStepTracker } from '@/components/analytics/CheckoutStepTracker'
import { AccountViewTracker } from '@/components/analytics/AccountViewTracker'
import type { PageType } from '@/lib/analytics/types'

export function AnalyticsProvider({
  children,
  pageType,
}: {
  children: ReactNode
  pageType?: PageType
}) {
  useEffect(() => {
    initDataLayer()
    applyConsentDefaults()
    initCookiebotConsentBridge()
  }, [])

  return (
    <>
      <PageViewTracker pageType={pageType} />
      <CheckoutStepTracker />
      <AccountViewTracker />
      <OutboundLinkTracker />
      <ScrollDepthTracker />
      {children}
    </>
  )
}
