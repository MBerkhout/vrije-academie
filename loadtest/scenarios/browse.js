import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend } from 'k6/metrics'
import { baseUrl, medusaHeaders, medusaUrl, publishableKey } from '../lib/env.js'

const pageDuration = new Trend('page_duration', true)

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '2m', target: Number(__ENV.K6_VUS || 20) },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    page_duration: ['p(95)<1500'],
  },
}

let handles = []

export function setup() {
  const key = publishableKey()
  if (!key) return { handles: [] }
  const res = http.get(`${medusaUrl()}/store/events?limit=50&sort=order`, {
    headers: medusaHeaders(),
  })
  if (res.status !== 200) return { handles: [] }
  const events = res.json('events') || []
  return {
    handles: events.map((e) => e.handle).filter(Boolean),
  }
}

export default function (data) {
  if (handles.length === 0) handles = data.handles || []
  const paths = ['/', '/ons-aanbod', '/agenda', '/ons-aanbod?sort=start_date']
  const path = paths[Math.floor(Math.random() * paths.length)]
  const start = Date.now()
  const res = http.get(`${baseUrl()}${path}`)
  pageDuration.add(Date.now() - start)
  check(res, { 'status 2xx/3xx': (r) => r.status >= 200 && r.status < 400 })

  if (handles.length > 0 && Math.random() < 0.4) {
    const handle = handles[Math.floor(Math.random() * handles.length)]
    const pdpStart = Date.now()
    const pdp = http.get(`${baseUrl()}/ons-aanbod/${encodeURIComponent(handle)}`)
    pageDuration.add(Date.now() - pdpStart)
    check(pdp, { 'pdp ok': (r) => r.status >= 200 && r.status < 400 })
  }
  sleep(Math.random() * 1.5 + 0.2)
}
