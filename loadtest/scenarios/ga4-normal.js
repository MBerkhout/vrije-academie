/**
 * GA4-shaped normal load: 50 VU, 10–15 min (2m ramp + 12m hold).
 * Mixed: ~60% browse, ~25% account, ~10% search, ~5% checkout.
 */
import { defaultSetup } from '../lib/ga4-setup.js'
import { ga4Thresholds, runMixedJourney } from '../lib/mixed-journey.js'

export const options = {
  scenarios: {
    normal: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: Number(__ENV.GA4_NORMAL_VUS || 50) },
        { duration: '12m', target: Number(__ENV.GA4_NORMAL_VUS || 50) },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: ga4Thresholds,
}

export function setup() {
  return defaultSetup()
}

export default function (data) {
  runMixedJourney(data.handles || [])
}
