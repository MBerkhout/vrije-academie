import { describe, expect, it } from 'vitest'

import { hubSpotWebInteractiveIframeSrc } from './hubspot-web-interactive'

describe('hubSpotWebInteractiveIframeSrc', () => {
  it('builds EU web interactive URL like vrijeacademie.nl', () => {
    const url = hubSpotWebInteractiveIframeSrc(
      '145840897',
      '276896252118',
      'https://www.vrijeacademie.nl/',
      'eu1',
    )
    expect(url).toBe(
      'https://145840897.hs-sites-eu1.com/hs-web-interactive-145840897-276896252118?parentPageUrl=https%3A%2F%2Fwww.vrijeacademie.nl%2F&enableResponsiveStyles=true',
    )
  })
})
