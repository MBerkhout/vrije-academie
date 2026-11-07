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

/**
 * Injects the developer embed script. The script only scans for `.hs-form-html` containers when it
 * executes, so after a client-side navigation (new container, script already loaded) we must
 * re-inject it. Concurrent calls while a load is pending are deduped.
 */
export function ensureHubSpotDeveloperEmbedScript(scriptSrc: string): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()

  const pending = scriptLoadPromises.get(scriptSrc)
  if (pending) return pending

  document.querySelectorAll(`script[src="${scriptSrc}"]`).forEach((el) => el.remove())

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = scriptSrc
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load HubSpot form embed: ${scriptSrc}`))
    document.body.appendChild(script)
  })

  const clear = () => scriptLoadPromises.delete(scriptSrc)
  promise.then(clear, clear)

  scriptLoadPromises.set(scriptSrc, promise)
  return promise
}
