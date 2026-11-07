// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { collectCheckoutAttribution } from '@/lib/analytics/attribution'

describe('collectCheckoutAttribution', () => {
  beforeEach(() => {
    vi.stubGlobal('Cookiebot', undefined)
    document.cookie = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('returns event_id and page without marketing cookies when consent is denied', () => {
    vi.stubGlobal('Cookiebot', { consent: { marketing: false, statistics: false } })
    const result = collectCheckoutAttribution({ paymentType: 'iDEAL', eventId: 'test-id' })
    expect(result.event_id).toBe('test-id')
    expect(result.payment_type).toBe('iDEAL')
    expect(result.client_id).toBeUndefined()
    expect(result.fbp).toBeUndefined()
  })

  it('reads GA and Meta cookies when consent is granted', () => {
    vi.stubGlobal('Cookiebot', { consent: { marketing: true, statistics: false } })
    document.cookie = '_ga=GA1.2.111.222; _fbp=fb.1.123'
    const result = collectCheckoutAttribution({ eventId: 'e1' })
    expect(result.client_id).toBe('111.222')
    expect(result.fbp).toBe('fb.1.123')
  })
})
