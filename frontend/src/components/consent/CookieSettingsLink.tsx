'use client'

import { OPEN_COOKIE_BANNER_EVENT } from '@/lib/analytics/consent/constants'
import { clearStoredConsent } from '@/lib/analytics/consent/storage'
import { isAnalyticsEnabled } from '@/lib/analytics/config'

export function CookieSettingsLink({ className }: { className?: string }) {
  if (!isAnalyticsEnabled()) return null

  return (
    <button
      type="button"
      className={
        className ??
        'text-white/55 underline decoration-white/30 underline-offset-2 hover:text-white/80 hover:decoration-white/50'
      }
      onClick={() => {
        clearStoredConsent()
        window.dispatchEvent(new Event(OPEN_COOKIE_BANNER_EVENT))
      }}
    >
      Cookie-instellingen
    </button>
  )
}
