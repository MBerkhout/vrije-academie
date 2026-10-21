'use client'

import { useEffect } from 'react'
import {
  ensureHubSpotDeveloperEmbedScript,
  hubspotDeveloperEmbedScriptSrc,
} from '@/lib/hubspot/hubspot-form-embed'

export function HubSpotFormEmbed({ formId }: { formId: string }) {
  const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID?.trim()
  const region = process.env.NEXT_PUBLIC_HUBSPOT_REGION?.trim() || 'eu1'

  useEffect(() => {
    if (!portalId) return
    const scriptSrc = hubspotDeveloperEmbedScriptSrc(portalId, region)
    let cancelled = false

    void ensureHubSpotDeveloperEmbedScript(scriptSrc).catch((err) => {
      if (!cancelled) console.error(err)
    })

    return () => {
      cancelled = true
    }
  }, [portalId, region, formId])

  if (!portalId) {
    return (
      <p className="p-6 border border-va-lightgray rounded text-va-gray text-center text-sm">
        HubSpot embed is niet geconfigureerd (NEXT_PUBLIC_HUBSPOT_PORTAL_ID ontbreekt).
      </p>
    )
  }

  return (
    <div
      className="hs-form-html"
      data-region={region}
      data-form-id={formId}
      data-portal-id={portalId}
    />
  )
}
