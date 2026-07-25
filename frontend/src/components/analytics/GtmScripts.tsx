import Script from 'next/script'
import { GoogleTagManager } from '@next/third-parties/google'
import { getCookieBotId, getGtmId, isAnalyticsEnabled } from '@/lib/analytics/config'

export function GtmScripts() {
  if (!isAnalyticsEnabled()) return null

  const gtmId = getGtmId()
  const cookieBotId = getCookieBotId()

  return (
    <>
      {cookieBotId ? (
        <Script
          id="cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid={cookieBotId}
          data-blockingmode="auto"
          strategy="beforeInteractive"
        />
      ) : null}
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
    </>
  )
}
