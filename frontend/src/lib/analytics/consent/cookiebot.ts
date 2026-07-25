import { pushRaw } from '@/lib/analytics/data-layer'
import { trackConsentUpdate } from '@/lib/analytics/events/consent'
import type { ConsentState } from '@/lib/analytics/types'

/** Set Consent Mode v2 defaults to denied before user choice. */
export function applyConsentDefaults(): void {
  pushRaw({
    event: 'consent_default',
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
}

function mapCookiebotConsent(): {
  ad_storage: ConsentState
  analytics_storage: ConsentState
  ad_user_data: ConsentState
  ad_personalization: ConsentState
} {
  const cb = typeof window !== 'undefined' ? window.Cookiebot?.consent : undefined
  const marketing = cb?.marketing === true
  const statistics = cb?.statistics === true
  const preferences = cb?.preferences === true

  return {
    ad_storage: marketing ? 'granted' : 'denied',
    analytics_storage: statistics ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing || preferences ? 'granted' : 'denied',
  }
}

declare global {
  interface Window {
    Cookiebot?: {
      consent?: {
        necessary?: boolean
        preferences?: boolean
        statistics?: boolean
        marketing?: boolean
      }
    }
    CookiebotCallback_OnAccept?: () => void
    CookiebotCallback_OnDecline?: () => void
  }
}

function pushConsentFromCookiebot(): void {
  trackConsentUpdate(mapCookiebotConsent())
}

/** Wire Cookiebot accept/decline callbacks to `consent_update`. */
export function initCookiebotConsentBridge(): void {
  if (typeof window === 'undefined') return

  const previousAccept = window.CookiebotCallback_OnAccept
  window.CookiebotCallback_OnAccept = () => {
    previousAccept?.()
    pushConsentFromCookiebot()
  }

  const previousDecline = window.CookiebotCallback_OnDecline
  window.CookiebotCallback_OnDecline = () => {
    previousDecline?.()
    pushConsentFromCookiebot()
  }

  if (window.Cookiebot?.consent) {
    pushConsentFromCookiebot()
  }
}
