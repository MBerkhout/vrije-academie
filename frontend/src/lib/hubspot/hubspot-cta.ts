/** Re-bind HubSpot popup CTAs after React renders trigger buttons. */
export function refreshHubSpotCtas(): void {
  if (typeof window === 'undefined') return
  window.HubSpotCallsToActions?.refresh()
}

export function whenHubSpotCtasReady(run: () => void): void {
  if (typeof window === 'undefined') return
  if (window.HubSpotCallsToActions) {
    run()
    return
  }
  const queue = window.hsCallsToActionsReady ?? []
  window.hsCallsToActionsReady = [...queue, run]
}

export function hubSpotCtaTriggerClass(ctaId: string): string {
  return `hs-cta-trigger-button hs-cta-trigger-button-${ctaId}`
}
