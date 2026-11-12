'use client'

import { CookieBanner } from '@/components/consent/CookieBanner'
import { isAnalyticsEnabled } from '@/lib/analytics/config'

export function ConsentShell({ suppressInDraftMode = false }: { suppressInDraftMode?: boolean }) {
  if (!isAnalyticsEnabled()) return null
  if (suppressInDraftMode) return null
  return <CookieBanner />
}
