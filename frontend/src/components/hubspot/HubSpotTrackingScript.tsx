import Script from 'next/script'

/** Loads HubSpot tracking (required for CTA pop-ups on external sites). */
export function HubSpotTrackingScript() {
  const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID?.trim()
  if (!portalId) return null

  return (
    <Script
      id="hs-script-loader"
      src={`https://js-eu1.hs-scripts.com/${portalId}.js`}
      strategy="afterInteractive"
    />
  )
}
