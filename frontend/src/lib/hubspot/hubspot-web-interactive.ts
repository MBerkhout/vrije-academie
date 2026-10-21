/** Host for HubSpot web interactive (popup CTA) iframes. */
export function hubSpotSitesHost(portalId: string, region: string): string {
  if (region === 'eu1') return `${portalId}.hs-sites-eu1.com`
  return `${portalId}.hs-sites.com`
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
