/**
 * Launch / peak: ramp to 150–200 VU, hold 10 min.
 */
import { defaultSetup } from '../lib/ga4-setup.js'
import { ga4Thresholds, runMixedJourney } from '../lib/mixed-journey.js'

const peakVus = Number(__ENV.GA4_PEAK_VUS || 200)

export const options = {
  scenarios: {
    peak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: peakVus },
        { duration: '10m', target: peakVus },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '1m',
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
