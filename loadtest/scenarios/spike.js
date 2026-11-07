import http from 'k6/http'
import { check, sleep } from 'k6'
import { baseUrl, env } from '../lib/env.js'

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 80,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 10 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
  },
}

export default function () {
  const handle = env('SPIKE_HANDLE', 'demo')
  const res = http.get(`${baseUrl()}/ons-aanbod/${encodeURIComponent(handle)}`)
  check(res, { ok: (r) => r.status === 200 })
  sleep(0.1)
}
