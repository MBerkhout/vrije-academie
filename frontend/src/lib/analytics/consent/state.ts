import { getStoredConsent } from '@/lib/analytics/consent/storage'

/** Whether first-party / attribution cookies may be read for checkout (accept only). */
export function hasAttributionConsent(): boolean {
  if (typeof window === 'undefined') return false
  return getStoredConsent() === true
}
