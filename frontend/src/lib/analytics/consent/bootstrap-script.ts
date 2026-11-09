import { HAS_CONSENT_COOKIE_NAME } from '@/lib/analytics/consent/constants'

/** Inline bootstrap: Consent Mode defaults before GTM loads (must run in beforeInteractive). */
export function getConsentBootstrapScript(): string {
  return `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'analytics_storage': 'denied',
  'wait_for_update': 500
});
if (document.cookie.indexOf('${HAS_CONSENT_COOKIE_NAME}=true') > -1) {
  gtag('consent', 'update', {
    'ad_storage': 'granted',
    'ad_user_data': 'granted',
    'ad_personalization': 'granted',
    'analytics_storage': 'granted'
  });
}
`.trim()
}
