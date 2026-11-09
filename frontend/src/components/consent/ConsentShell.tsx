'use client'

import { CookieBanner } from '@/components/consent/CookieBanner'
import { isAnalyticsEnabled } from '@/lib/analytics/config'

export function ConsentShell() {
  if (!isAnalyticsEnabled()) return null
  return <CookieBanner />
}
