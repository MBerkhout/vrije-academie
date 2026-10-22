import { describe, expect, it } from 'vitest'
import { resolveRedirectDestination } from './redirects'

describe('resolveRedirectDestination', () => {
  it('turns relative paths into absolute URLs using the request origin', () => {
    const url = resolveRedirectDestination(
      '/ons-aanbod',
      'https://v2.vrijeacademie.nl/architectuurcollege-specials-nu-2750-ipv-35',
    )
    expect(url.toString()).toBe('https://v2.vrijeacademie.nl/ons-aanbod')
  })

  it('preserves query strings on path destinations', () => {
    const url = resolveRedirectDestination(
      '/magazine-aanvragen?utm_source=wbooks',
      'https://v2.vrijeacademie.nl/magazine-aanvragen-wbooks',
    )
    expect(url.pathname).toBe('/magazine-aanvragen')
    expect(url.searchParams.get('utm_source')).toBe('wbooks')
  })

  it('passes through absolute external URLs', () => {
    const url = resolveRedirectDestination(
      'https://example.com/path',
      'https://v2.vrijeacademie.nl/',
    )
    expect(url.toString()).toBe('https://example.com/path')
  })
})
