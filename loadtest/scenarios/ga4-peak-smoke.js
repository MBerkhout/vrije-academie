/** Peak drill: 200 VU for 5 min (after checkout path fix). */
import { defaultSetup } from '../lib/ga4-setup.js'
import { ga4Thresholds, runMixedJourney } from '../lib/mixed-journey.js'

const peakVus = Number(__ENV.GA4_PEAK_VUS || 200)

export const options = {
  scenarios: {
    peak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: peakVus },
        { duration: '3m', target: peakVus },
      ],
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
