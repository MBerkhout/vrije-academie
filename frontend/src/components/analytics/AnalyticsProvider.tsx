'use client'

import { useEffect, type ReactNode } from 'react'
import { consentStatesForChoice } from '@/lib/analytics/consent/gtag'
import { getStoredConsent } from '@/lib/analytics/consent/storage'
import { trackConsentUpdate } from '@/lib/analytics/events/consent'
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
    const stored = getStoredConsent()
    if (stored === true) {
      trackConsentUpdate(consentStatesForChoice(true))
    } else if (stored === false) {
      trackConsentUpdate(consentStatesForChoice(false))
    }
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
