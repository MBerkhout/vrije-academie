import {
  HAS_CONSENT_COOKIE_NAME,
  HAS_CONSENT_MAX_AGE_SECONDS,
  HAS_CONSENT_SESSION_KEY,
} from '@/lib/analytics/consent/constants'

export type StoredConsent = true | false | null

function cookieSecureSuffix(): string {
  if (typeof window === 'undefined') return ''
  return window.location.protocol === 'https:' ? ';Secure' : ''
}

function parseConsentValue(value: string | null | undefined): StoredConsent {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

function readConsentFromCookie(): StoredConsent {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  for (const part of cookies) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(`${HAS_CONSENT_COOKIE_NAME}=`)) continue
    const value = trimmed.slice(HAS_CONSENT_COOKIE_NAME.length + 1)
    return parseConsentValue(value)
  }
  return null
}

function readConsentFromSession(): StoredConsent {
  if (typeof sessionStorage === 'undefined') return null
  try {
    return parseConsentValue(sessionStorage.getItem(HAS_CONSENT_SESSION_KEY))
  } catch {
    return null
  }
}

function writeConsentToSession(consent: boolean | null): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    if (consent === null) sessionStorage.removeItem(HAS_CONSENT_SESSION_KEY)
    else sessionStorage.setItem(HAS_CONSENT_SESSION_KEY, consent ? 'true' : 'false')
  } catch {
    // Private mode / blocked storage — cookie is enough when it works.
  }
}

/** Read stored choice (cookie, else session fallback). */
export function getStoredConsent(): StoredConsent {
  const fromCookie = readConsentFromCookie()
  if (fromCookie !== null) return fromCookie
  return readConsentFromSession()
}

/** Persist accept/reject for 12 months on `/` (+ tab session fallback). */
export function setStoredConsent(consent: boolean): void {
  if (typeof document === 'undefined') return
  const maxAge = `;max-age=${HAS_CONSENT_MAX_AGE_SECONDS}`
  const secure = cookieSecureSuffix()
  document.cookie = `${HAS_CONSENT_COOKIE_NAME}=${consent ? 'true' : 'false'};path=/${maxAge};SameSite=Lax${secure}`
  writeConsentToSession(consent)
}

export function clearStoredConsent(): void {
  if (typeof document === 'undefined') return
  const secure = cookieSecureSuffix()
  document.cookie = `${HAS_CONSENT_COOKIE_NAME}=;path=/;max-age=0;SameSite=Lax${secure}`
  writeConsentToSession(null)
}
