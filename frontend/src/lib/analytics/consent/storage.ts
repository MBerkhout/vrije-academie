import {
  HAS_CONSENT_COOKIE_NAME,
  HAS_CONSENT_MAX_AGE_SECONDS,
} from '@/lib/analytics/consent/constants'

export type StoredConsent = true | false | null

function cookieSecureSuffix(): string {
  if (typeof window === 'undefined') return ''
  return window.location.protocol === 'https:' ? ';Secure' : ''
}

/** Read `hasConsent` cookie (null = no choice yet). */
export function getStoredConsent(): StoredConsent {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  for (const part of cookies) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(`${HAS_CONSENT_COOKIE_NAME}=`)) continue
    const value = trimmed.slice(HAS_CONSENT_COOKIE_NAME.length + 1)
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return null
}

/** Persist accept/reject for 12 months on `/`. */
export function setStoredConsent(consent: boolean): void {
  if (typeof document === 'undefined') return
  const maxAge = `;max-age=${HAS_CONSENT_MAX_AGE_SECONDS}`
  const secure = cookieSecureSuffix()
  document.cookie = `${HAS_CONSENT_COOKIE_NAME}=${consent ? 'true' : 'false'};path=/${maxAge};SameSite=Lax${secure}`
}

export function clearStoredConsent(): void {
  if (typeof document === 'undefined') return
  const secure = cookieSecureSuffix()
  document.cookie = `${HAS_CONSENT_COOKIE_NAME}=;path=/;max-age=0;SameSite=Lax${secure}`
}
