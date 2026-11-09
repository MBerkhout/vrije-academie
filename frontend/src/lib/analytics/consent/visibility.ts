import {
  BOT_USER_AGENT_PATTERN,
  PRIVACY_COOKIE_POLICY_PATH,
} from '@/lib/analytics/consent/constants'

declare global {
  interface Window {
    doNotTrack?: string
  }
}
import { getStoredConsent, type StoredConsent } from '@/lib/analytics/consent/storage'

export function isDoNotTrackEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { msDoNotTrack?: string }
  const dnt = nav.doNotTrack ?? nav.msDoNotTrack ?? window.doNotTrack
  if (dnt == null || dnt === '') return false
  const normalized = String(dnt).toLowerCase()
  return normalized === '1' || normalized === 'yes'
}

export function isBotUserAgent(userAgent: string): boolean {
  return BOT_USER_AGENT_PATTERN.test(userAgent)
}

export function isPrivacyPolicyPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/'
  const privacy = PRIVACY_COOKIE_POLICY_PATH.replace(/\/$/, '')
  return normalized === privacy || normalized.startsWith(`${privacy}/`)
}

/**
 * Whether the cookie banner should render for this visitor/path.
 * `forceOpen` bypasses stored consent (footer "Cookie-instellingen").
 */
export function shouldShowCookieBanner(options: {
  pathname: string
  userAgent: string
  storedConsent?: StoredConsent
  forceOpen?: boolean
}): boolean {
  if (options.forceOpen) return true
  if (isBotUserAgent(options.userAgent)) return false
  if (isDoNotTrackEnabled()) return false
  if (isPrivacyPolicyPath(options.pathname)) return false

  const stored = options.storedConsent ?? getStoredConsent()
  return stored === null
}
