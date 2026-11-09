// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  consentStatesForChoice,
  setConsentDefault,
  updateConsentFromChoice,
} from '@/lib/analytics/consent/gtag'

vi.mock('@/lib/analytics/config', () => ({
  isAnalyticsEnabled: () => true,
}))

describe('consent gtag', () => {
  beforeEach(() => {
    window.dataLayer = []
    window.gtag = undefined
  })

  it('pushes consent default as gtag arguments', () => {
    setConsentDefault()
    expect(window.dataLayer!.length).toBeGreaterThan(0)
    const first = window.dataLayer![0] as unknown as unknown[]
    expect(first[0]).toBe('consent')
    expect(first[1]).toBe('default')
    expect(first[2]).toMatchObject({
      analytics_storage: 'denied',
      wait_for_update: 500,
    })
  })

  it('pushes consent update and consent_update event when granted', () => {
    updateConsentFromChoice(true)
    const gtagCall = window.dataLayer!.find(
      (entry) => Array.isArray(entry) && entry[0] === 'consent' && entry[1] === 'update'
    ) as unknown[] | undefined
    expect(gtagCall?.[2]).toEqual(consentStatesForChoice(true))

    const event = window.dataLayer!.find(
      (entry) => !Array.isArray(entry) && (entry as { event?: string }).event === 'consent_update'
    ) as { analytics_storage?: string } | undefined
    expect(event?.analytics_storage).toBe('granted')
  })
})
