// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { collectCheckoutAttribution } from '@/lib/analytics/attribution'

import { setStoredConsent, clearStoredConsent } from '@/lib/analytics/consent/storage'

describe('collectCheckoutAttribution', () => {
  beforeEach(() => {
    document.cookie = ''
  })

  afterEach(() => {
    clearStoredConsent()
    sessionStorage.clear()
  })

  it('returns event_id and page without marketing cookies when consent is denied', () => {
    setStoredConsent(false)
    const result = collectCheckoutAttribution({ paymentType: 'iDEAL', eventId: 'test-id' })
    expect(result.event_id).toBe('test-id')
    expect(result.payment_type).toBe('iDEAL')
    expect(result.client_id).toBeUndefined()
    expect(result.fbp).toBeUndefined()
  })

  it('reads GA and Meta cookies when consent is granted', () => {
    setStoredConsent(true)
    document.cookie = '_ga=GA1.2.111.222'
    document.cookie = '_fbp=fb.1.123'
    const result = collectCheckoutAttribution({ eventId: 'e1' })
    expect(result.client_id).toBe('111.222')
    expect(result.fbp).toBe('fb.1.123')
  })
})
