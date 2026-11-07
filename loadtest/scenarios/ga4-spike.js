/**
 * Email-blast spike: jump to 300–400 VU for ~2 min inside a 5 min window.
 */
import { defaultSetup } from '../lib/ga4-setup.js'
import { ga4Thresholds, runMixedJourney } from '../lib/mixed-journey.js'

const spikeVus = Number(__ENV.GA4_SPIKE_VUS || 350)

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 40 },
        { duration: '30s', target: spikeVus },
        { duration: '2m', target: spikeVus },
        { duration: '2m', target: 40 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ...ga4Thresholds,
    // Spike may briefly exceed p95; track failures strictly.
    page_load_ms: ['p(95)<2000'],
    checkout_step_ms: ['p(95)<3000'],
  },
}

export function setup() {
  return defaultSetup()
}

export default function (data) {
  runMixedJourney(data.handles || [])
}
