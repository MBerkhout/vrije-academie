'use client'

import Script from 'next/script'

const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID?.trim()
const region = process.env.NEXT_PUBLIC_HUBSPOT_REGION?.trim() || 'eu1'

function hubspotEmbedScriptHost(regionCode: string): string {
  if (regionCode === 'eu1') return 'js-eu1.hsforms.net'
  if (regionCode === 'na1') return 'js-na1.hsforms.net'
  return 'js.hsforms.net'
}

export function HubSpotFormEmbed({ formId }: { formId: string }) {
  if (!portalId) {
    return (
      <p className="p-6 border border-va-lightgray rounded text-va-gray text-center text-sm">
        HubSpot embed is niet geconfigureerd (NEXT_PUBLIC_HUBSPOT_PORTAL_ID ontbreekt).
      </p>
    )
  }

  const scriptSrc = `https://${hubspotEmbedScriptHost(region)}/forms/embed/developer/${portalId}.js`

  return (
    <>
      <Script src={scriptSrc} strategy="afterInteractive" />
      <div
        className="hs-form-html"
        data-region={region}
        data-form-id={formId}
        data-portal-id={portalId}
      />
    </>
  )
}
