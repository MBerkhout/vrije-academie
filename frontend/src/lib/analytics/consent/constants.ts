/** Shared with legacy vrijeacademie.nl CookiesEuBanner — same name/value for cutover. */
export const HAS_CONSENT_COOKIE_NAME = 'hasConsent'

/** Tab-scoped fallback when `hasConsent` cannot persist (e.g. preview iframe). */
export const HAS_CONSENT_SESSION_KEY = 'va_hasConsent'

/** 12 months in seconds (legacy banner used ms expiry). */
export const HAS_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export const PRIVACY_COOKIE_POLICY_PATH = '/privacy-en-cookiebeleid'

export const TRACKING_COOKIES_PREFIXES = [
  '__utma',
  '__utmb',
  '__utmc',
  '__utmt',
  '__utmv',
  '__utmz',
  '_ga',
  '_gat',
  '_gid',
  '_fbp',
  '_fbc',
] as const

export const BOT_USER_AGENT_PATTERN = /bot|crawler|spider|crawling/i

export const OPEN_COOKIE_BANNER_EVENT = 'va:open-cookie-banner'
