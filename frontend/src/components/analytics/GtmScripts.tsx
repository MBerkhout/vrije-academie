import Script from 'next/script'
import { GoogleTagManager } from '@next/third-parties/google'
import { getConsentBootstrapScript } from '@/lib/analytics/consent/bootstrap-script'
import { getGtmId, isAnalyticsEnabled } from '@/lib/analytics/config'

export function GtmScripts() {
  if (!isAnalyticsEnabled()) return null

  const gtmId = getGtmId()
  if (!gtmId) return null

  return (
    <>
      <Script
        id="consent-default"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: getConsentBootstrapScript() }}
      />
      <GoogleTagManager gtmId={gtmId} />
    </>
  )
}
