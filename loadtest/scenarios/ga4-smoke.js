/** Quick 3 min @ 50 VU after journey fixes (not a full GA4 normal run). */
import { defaultSetup } from '../lib/ga4-setup.js'
import { ga4Thresholds, runMixedJourney } from '../lib/mixed-journey.js'

export const options = {
  vus: Number(__ENV.GA4_NORMAL_VUS || 50),
  duration: '3m',
  thresholds: ga4Thresholds,
}

export function setup() {
  return defaultSetup()
}

export default function (data) {
  runMixedJourney(data.handles || [])
}
