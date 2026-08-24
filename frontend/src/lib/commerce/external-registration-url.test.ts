import { describe, expect, it } from 'vitest'
import {
  bookingPanelExternalRegistrationUrl,
  sessionExternalRegistrationUrl,
} from './external-registration-url'
import type { EventVariant } from './types'

function variant(url?: string | null): EventVariant {
  return {
    id: url ?? 'v',
    title: 'Session',
    external_registration_url: url,
  }
}

describe('sessionExternalRegistrationUrl', () => {
  it('uses the child URL when set', () => {
    expect(sessionExternalRegistrationUrl(variant('https://child.example'), 'https://group.example')).toBe(
      'https://child.example',
    )
  })

  it('falls back to the product-group URL', () => {
    expect(sessionExternalRegistrationUrl(variant(null), 'https://group.example')).toBeNull()
    expect(
      sessionExternalRegistrationUrl({ id: 'v', title: 'Session' }, 'https://group.example'),
    ).toBe('https://group.example')
  })
})

describe('bookingPanelExternalRegistrationUrl', () => {
  it('returns the shared URL when every session uses the same partner link', () => {
    expect(
      bookingPanelExternalRegistrationUrl({
        external_registration_url: null,
        variants: [variant('https://labrys.example/a'), variant('https://labrys.example/a')],
      }),
    ).toBe('https://labrys.example/a')
  })

  it('returns null when sessions have different partner URLs', () => {
    expect(
      bookingPanelExternalRegistrationUrl({
        external_registration_url: null,
        variants: [variant('https://a.example'), variant('https://b.example')],
      }),
    ).toBeNull()
  })

  it('returns null when some sessions are cart and some are external', () => {
    expect(
      bookingPanelExternalRegistrationUrl({
        external_registration_url: null,
        variants: [variant('https://labrys.example/a'), variant(null)],
      }),
    ).toBeNull()
  })

  it('falls back to the group URL when children have none', () => {
    expect(
      bookingPanelExternalRegistrationUrl({
        external_registration_url: 'https://group.example',
        variants: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }],
      }),
    ).toBe('https://group.example')
  })
})
