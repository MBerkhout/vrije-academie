import { pushEvent } from '@/lib/analytics/data-layer'
import type { ConsentState } from '@/lib/analytics/types'

export function trackConsentUpdate(states: {
  ad_storage: ConsentState
  analytics_storage: ConsentState
  ad_user_data: ConsentState
  ad_personalization: ConsentState
}): void {
  pushEvent({
    event: 'consent_update',
    ...states,
  })
}
