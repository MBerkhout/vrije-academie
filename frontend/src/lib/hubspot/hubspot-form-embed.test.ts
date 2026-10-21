import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ensureHubSpotDeveloperEmbedScript,
  hubspotDeveloperEmbedScriptSrc,
  hubspotEmbedScriptHost,
} from './hubspot-form-embed'

describe('hubspotDeveloperEmbedScriptSrc', () => {
  it('builds EU developer embed URL', () => {
    expect(hubspotDeveloperEmbedScriptSrc('145840897', 'eu1')).toBe(
      'https://js-eu1.hsforms.net/forms/embed/developer/145840897.js',
    )
  })
})

describe('hubspotEmbedScriptHost', () => {
  it('maps known regions', () => {
    expect(hubspotEmbedScriptHost('eu1')).toBe('js-eu1.hsforms.net')
    expect(hubspotEmbedScriptHost('na1')).toBe('js-na1.hsforms.net')
  })
})

describe('ensureHubSpotDeveloperEmbedScript', () => {
  const scriptSrc = 'https://js-eu1.hsforms.net/forms/embed/developer/999.js'

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('injects one script tag and dedupes concurrent calls', async () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild')

    const first = ensureHubSpotDeveloperEmbedScript(scriptSrc)
    const second = ensureHubSpotDeveloperEmbedScript(scriptSrc)

    expect(first).toBe(second)
    expect(document.querySelectorAll(`script[src="${scriptSrc}"]`)).toHaveLength(1)

    const script = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement
    script.onload?.(new Event('load'))

    await expect(first).resolves.toBeUndefined()
    expect(appendSpy).toHaveBeenCalledTimes(1)
  })

  it('resolves when script tag already exists', async () => {
    const script = document.createElement('script')
    script.src = scriptSrc
    document.body.appendChild(script)

    await expect(ensureHubSpotDeveloperEmbedScript(scriptSrc)).resolves.toBeUndefined()
    expect(document.querySelectorAll(`script[src="${scriptSrc}"]`)).toHaveLength(1)
  })
})
