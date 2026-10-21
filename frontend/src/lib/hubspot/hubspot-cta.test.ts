import { describe, expect, it } from 'vitest'

import { hubSpotCtaTriggerClass } from './hubspot-cta'

describe('hubSpotCtaTriggerClass', () => {
  it('matches HubSpot trigger button classes', () => {
    expect(hubSpotCtaTriggerClass('276896252118')).toBe(
      'hs-cta-trigger-button hs-cta-trigger-button-276896252118',
    )
  })
})
