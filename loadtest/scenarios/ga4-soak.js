/**
 * Soak: 30–50 VU for 1 hour (override duration with GA4_SOAK_DURATION for shorter drills).
 */
import { defaultSetup } from '../lib/ga4-setup.js'
import { ga4Thresholds, runMixedJourney } from '../lib/mixed-journey.js'

const soakVus = Number(__ENV.GA4_SOAK_VUS || 40)
const soakDuration = __ENV.GA4_SOAK_DURATION || '1h'

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: soakVus,
      duration: soakDuration,
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
