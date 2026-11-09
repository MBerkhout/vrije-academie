import { describe, expect, it } from 'vitest'

import { PRIVACY_COOKIE_POLICY_PATH } from '@/lib/analytics/consent/constants'
import {
  isBotUserAgent,
  isPrivacyPolicyPath,
  shouldShowCookieBanner,
} from '@/lib/analytics/consent/visibility'

describe('cookie banner visibility', () => {
  it('detects bots', () => {
    expect(isBotUserAgent('Mozilla/Googlebot/2.1')).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0 Chrome')).toBe(false)
  })

  it('matches privacy policy path', () => {
    expect(isPrivacyPolicyPath(PRIVACY_COOKIE_POLICY_PATH)).toBe(true)
    expect(isPrivacyPolicyPath('/')).toBe(false)
  })

  it('shows only when consent is unknown', () => {
    expect(
      shouldShowCookieBanner({
        pathname: '/',
        userAgent: 'Mozilla',
        storedConsent: null,
      })
    ).toBe(true)

    expect(
      shouldShowCookieBanner({
        pathname: '/',
        userAgent: 'Mozilla',
        storedConsent: true,
      })
    ).toBe(false)

    expect(
      shouldShowCookieBanner({
        pathname: PRIVACY_COOKIE_POLICY_PATH,
        userAgent: 'Mozilla',
        storedConsent: null,
      })
    ).toBe(false)

    expect(
      shouldShowCookieBanner({
        pathname: '/',
        userAgent: 'Googlebot',
        storedConsent: null,
      })
    ).toBe(false)
  })

  it('forceOpen ignores stored consent', () => {
    expect(
      shouldShowCookieBanner({
        pathname: '/',
        userAgent: 'Mozilla',
        storedConsent: false,
        forceOpen: true,
      })
    ).toBe(true)
  })
})
