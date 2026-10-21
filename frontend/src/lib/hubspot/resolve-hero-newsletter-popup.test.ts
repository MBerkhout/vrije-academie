import { describe, expect, it } from 'vitest'

import { resolveHeroNewsletterPopup } from './resolve-hero-newsletter-popup'

describe('resolveHeroNewsletterPopup', () => {
  it('prefers interactive CTA when CTA id is set', () => {
    expect(resolveHeroNewsletterPopup('b8d92c58-aca6-4807-a28a-f737a986f666', '276896252118')).toEqual({
      mode: 'interactive',
      ctaId: '276896252118',
      formId: 'b8d92c58-aca6-4807-a28a-f737a986f666',
    })
  })

  it('uses form embed when only form GUID is set', () => {
    expect(resolveHeroNewsletterPopup('b8d92c58-aca6-4807-a28a-f737a986f666', undefined)).toEqual({
      mode: 'form',
      formId: 'b8d92c58-aca6-4807-a28a-f737a986f666',
    })
  })

  it('returns undefined when no HubSpot ids are configured', () => {
    expect(resolveHeroNewsletterPopup(undefined, undefined)).toBeUndefined()
  })
})
