import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  HUBSPOT_WEB_INTERACTIVE_CLOSE,
  HUBSPOT_WEB_INTERACTIVE_HAS_CLOSED,
  HUBSPOT_WEB_INTERACTIVE_PARENT_INIT,
  bindHubSpotWebInteractiveIframe,
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

describe('bindHubSpotWebInteractiveIframe', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends HS_CTA_PARENT_INIT once when the iframe is already complete', () => {
    const iframe = document.createElement('iframe')
    const postMessage = vi.fn()
    Object.defineProperty(iframe, 'contentWindow', { value: { postMessage }, configurable: true })
    Object.defineProperty(iframe, 'contentDocument', { value: { readyState: 'complete' }, configurable: true })

    const unbind = bindHubSpotWebInteractiveIframe(iframe, () => {})
  unbind()

    expect(postMessage).toHaveBeenCalledTimes(1)
    expect(postMessage.mock.calls[0]?.[0]).toEqual({ type: HUBSPOT_WEB_INTERACTIVE_PARENT_INIT })
    expect(postMessage.mock.calls[0]?.[2]?.[0]).toBeInstanceOf(MessagePort)
  })

  it('waits for the load event when the iframe is still loading', () => {
    const iframe = document.createElement('iframe')
    const postMessage = vi.fn()
    Object.defineProperty(iframe, 'contentWindow', { value: { postMessage }, configurable: true })
    Object.defineProperty(iframe, 'contentDocument', { value: { readyState: 'loading' }, configurable: true })

    const unbind = bindHubSpotWebInteractiveIframe(iframe, () => {})
    expect(postMessage).not.toHaveBeenCalled()

    Object.defineProperty(iframe, 'contentDocument', { value: { readyState: 'complete' }, configurable: true })
    iframe.dispatchEvent(new Event('load'))
    expect(postMessage).toHaveBeenCalledTimes(1)

    unbind()
  })
})
