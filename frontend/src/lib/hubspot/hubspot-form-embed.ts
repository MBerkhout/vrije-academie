/** HubSpot developer embed (`hs-form-html`) — load script on client mount (SPA-safe). */

const scriptLoadPromises = new Map<string, Promise<void>>()

export function hubspotEmbedScriptHost(regionCode: string): string {
  if (regionCode === 'eu1') return 'js-eu1.hsforms.net'
  if (regionCode === 'na1') return 'js-na1.hsforms.net'
  return 'js.hsforms.net'
}

export function hubspotDeveloperEmbedScriptSrc(portalId: string, region: string): string {
  return `https://${hubspotEmbedScriptHost(region)}/forms/embed/developer/${portalId}.js`
}

/** Idempotent: injects the developer embed script once per URL (works after Next.js client navigations). */
export function ensureHubSpotDeveloperEmbedScript(scriptSrc: string): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()

  const cached = scriptLoadPromises.get(scriptSrc)
  if (cached) return cached

  const existing = document.querySelector(`script[src="${scriptSrc}"]`)
  if (existing) {
    const resolved = Promise.resolve()
    scriptLoadPromises.set(scriptSrc, resolved)
    return resolved
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = scriptSrc
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load HubSpot form embed: ${scriptSrc}`))
    document.body.appendChild(script)
  })

  scriptLoadPromises.set(scriptSrc, promise)
  return promise
}
