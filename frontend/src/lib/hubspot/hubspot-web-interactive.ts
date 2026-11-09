/** Host for HubSpot web interactive (popup CTA) iframes. */
export function hubSpotSitesHost(portalId: string, region: string): string {
  if (region === 'eu1') return `${portalId}.hs-sites-eu1.com`
  return `${portalId}.hs-sites.com`
}

export function hubSpotWebInteractiveOrigin(portalId: string, region: string): string {
  return `https://${hubSpotSitesHost(portalId, region)}`
}

/** Parent handshake message (see HubSpot `web-interactives-embed.js`). */
export const HUBSPOT_WEB_INTERACTIVE_PARENT_INIT = 'HS_CTA_PARENT_INIT' as const

/** Iframe → parent via MessageChannel when the visitor closes the CTA. */
export const HUBSPOT_WEB_INTERACTIVE_CLOSE = 'HS_CTA_CLOSE_INTERACTIVE' as const

export const HUBSPOT_WEB_INTERACTIVE_HAS_CLOSED = 'HS_CTA_HAS_CLOSED' as const

const HUBSPOT_CTA_CALLBACK_TYPE = 'hsCallsToActionCallback' as const

export type HubSpotWebInteractivePortMessage = {
  type?: string
  payload?: unknown
}

function parseHubSpotMessageData(data: unknown): Record<string, unknown> | null {
  if (data == null) return null
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data) as unknown
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  if (typeof data === 'object') return data as Record<string, unknown>
  return null
}

/** Recognizes close signals on `window` `message` (HubSpot embed script) or MessageChannel payloads. */
export function isHubSpotInteractiveCloseMessage(data: unknown): boolean {
  if (data === HUBSPOT_WEB_INTERACTIVE_CLOSE || data === HUBSPOT_WEB_INTERACTIVE_HAS_CLOSED) return true

  const record = parseHubSpotMessageData(data)
  if (!record) return false

  const type = record.type
  if (type === HUBSPOT_WEB_INTERACTIVE_CLOSE || type === HUBSPOT_WEB_INTERACTIVE_HAS_CLOSED) return true

  if (
    type === HUBSPOT_CTA_CALLBACK_TYPE &&
    record.eventName === 'onCallToActionClosed'
  ) {
    return true
  }

  return false
}

/**
 * HubSpot interactive iframes expect a MessageChannel `INIT` on load; the in-iframe X posts
 * `HS_CTA_CLOSE_INTERACTIVE` on that channel (not a bubbling click on the parent document).
 */
export function bindHubSpotWebInteractiveIframe(
  iframe: HTMLIFrameElement,
  onClose: () => void,
): () => void {
  const channel = new MessageChannel()

  const handlePortMessage = (event: MessageEvent<HubSpotWebInteractivePortMessage>) => {
    if (isHubSpotInteractiveCloseMessage(event.data)) onClose()
  }

  channel.port1.onmessage = handlePortMessage

  const connect = () => {
    iframe.contentWindow?.postMessage({ type: HUBSPOT_WEB_INTERACTIVE_PARENT_INIT }, '*', [channel.port2])
  }

  iframe.addEventListener('load', connect)
  connect()

  return () => {
    iframe.removeEventListener('load', connect)
    channel.port1.onmessage = null
    channel.port1.close()
    channel.port2.close()
  }
}

/**
 * Same iframe URL as vrijeacademie.nl popup CTA (image + form).
 * @see hs-web-interactive-{portalId}-{ctaId}
 */
export function hubSpotWebInteractiveIframeSrc(
  portalId: string,
  ctaId: string,
  parentPageUrl: string,
  region = 'eu1',
): string {
  const host = hubSpotSitesHost(portalId, region)
  const path = `/hs-web-interactive-${portalId}-${ctaId}`
  const params = new URLSearchParams({
    parentPageUrl,
    enableResponsiveStyles: 'true',
  })
  return `https://${host}${path}?${params.toString()}`
}
