import { trackConsentUpdate } from '@/lib/analytics/events/consent'
import type { ConsentState } from '@/lib/analytics/types'
import { initDataLayer } from '@/lib/analytics/data-layer'

const CONSENT_KEYS = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
] as const

function ensureGtag(): void {
  if (typeof window === 'undefined') return
  initDataLayer()
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args)
    }
  }
}

export function consentStatesForChoice(
  granted: boolean
): Record<(typeof CONSENT_KEYS)[number], ConsentState> {
  const state: ConsentState = granted ? 'granted' : 'denied'
  return {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
  }
}

/** Push Consent Mode v2 default (denied) — also used from inline beforeInteractive script. */
export function setConsentDefault(): void {
  ensureGtag()
  window.gtag!('consent', 'default', {
    ...consentStatesForChoice(false),
    wait_for_update: 500,
  })
}

/** Push `gtag('consent','update')` and mirror to `consent_update` dataLayer event. */
export function updateConsentFromChoice(granted: boolean): void {
  ensureGtag()
  const states = consentStatesForChoice(granted)
  window.gtag!('consent', 'update', states)
  trackConsentUpdate(states)
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}
