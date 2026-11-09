import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  HUBSPOT_WEB_INTERACTIVE_CLOSE,
  HUBSPOT_WEB_INTERACTIVE_HAS_CLOSED,
  HUBSPOT_WEB_INTERACTIVE_PARENT_INIT,
  createHubSpotWebInteractiveBridge,
  hubSpotWebInteractiveIframeSrc,
  hubSpotWebInteractiveOrigin,
  isHubSpotInteractiveCloseMessage,
} from './hubspot-web-interactive'

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

describe('hubSpotWebInteractiveOrigin', () => {
  it('returns https origin for EU hs-sites host', () => {
    expect(hubSpotWebInteractiveOrigin('145840897', 'eu1')).toBe('https://145840897.hs-sites-eu1.com')
  })
})

describe('isHubSpotInteractiveCloseMessage', () => {
  it('accepts MessageChannel close types', () => {
    expect(isHubSpotInteractiveCloseMessage({ type: HUBSPOT_WEB_INTERACTIVE_CLOSE })).toBe(true)
    expect(isHubSpotInteractiveCloseMessage({ type: HUBSPOT_WEB_INTERACTIVE_HAS_CLOSED })).toBe(true)
  })

  it('accepts HubSpot embed window callback payload', () => {
    expect(
      isHubSpotInteractiveCloseMessage({
        type: 'hsCallsToActionCallback',
        eventName: 'onCallToActionClosed',
        id: '276896252118',
      }),
    ).toBe(true)
  })

  it('rejects unrelated messages', () => {
    expect(isHubSpotInteractiveCloseMessage({ type: 'HS_CTA_STARTED' })).toBe(false)
    expect(isHubSpotInteractiveCloseMessage('hello')).toBe(false)
  })
})

describe('createHubSpotWebInteractiveBridge', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('sends HS_CTA_PARENT_INIT once per iframe load', () => {
    const iframe = document.createElement('iframe')
    const postMessage = vi.fn()
    Object.defineProperty(iframe, 'contentWindow', { value: { postMessage }, configurable: true })

    const bridge = createHubSpotWebInteractiveBridge(() => {})
    bridge.handshake(iframe)
    bridge.handshake(iframe)

    expect(postMessage).toHaveBeenCalledTimes(1)
    expect(postMessage.mock.calls[0]?.[0]).toEqual({ type: HUBSPOT_WEB_INTERACTIVE_PARENT_INIT })

    bridge.dispose()
  })

})
