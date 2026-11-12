// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  HAS_CONSENT_COOKIE_NAME,
} from '@/lib/analytics/consent/constants'
import {
  clearStoredConsent,
  getStoredConsent,
  setStoredConsent,
} from '@/lib/analytics/consent/storage'

describe('consent storage', () => {
  beforeEach(() => {
    document.cookie = ''
  })

  afterEach(() => {
    clearStoredConsent()
  })

  it('returns null when cookie is absent', () => {
    expect(getStoredConsent()).toBeNull()
  })

  it('persists true and false values', () => {
    setStoredConsent(true)
    expect(getStoredConsent()).toBe(true)
    expect(document.cookie).toContain(`${HAS_CONSENT_COOKIE_NAME}=true`)

    setStoredConsent(false)
    expect(getStoredConsent()).toBe(false)
  })

  it('falls back to session storage when cookie is unavailable', () => {
    setStoredConsent(true)
    document.cookie = ''
    expect(getStoredConsent()).toBe(true)
  })

  it('clears stored consent', () => {
    setStoredConsent(true)
    clearStoredConsent()
    expect(getStoredConsent()).toBeNull()
  })
})
