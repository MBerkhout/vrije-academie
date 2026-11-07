import http from 'k6/http'
import { check, sleep } from 'k6'
import { medusaHeaders, medusaUrl } from '../lib/env.js'

export const options = {
  vus: Number(__ENV.K6_VUS || 25),
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1200'],
  },
}

let handles = []

export function setup() {
  const res = http.get(`${medusaUrl()}/store/events?limit=40&sort=order`, {
    headers: medusaHeaders(),
  })
  return { handles: (res.json('events') || []).map((e) => e.handle).filter(Boolean) }
}

export default function (data) {
  if (handles.length === 0) handles = data.handles || []
  const roll = Math.random()
  const headers = medusaHeaders()
  if (roll < 0.4) {
    const res = http.get(`${medusaUrl()}/store/events?limit=24&sort=order`, { headers })
    check(res, { ok: (r) => r.status === 200 })
  } else if (roll < 0.7 && handles.length) {
    const h = handles[Math.floor(Math.random() * handles.length)]
    const res = http.get(`${medusaUrl()}/store/events/${encodeURIComponent(h)}`, { headers })
    check(res, { ok: (r) => r.status === 200 })
  } else if (roll < 0.85) {
    const res = http.get(`${medusaUrl()}/store/agenda?limit=24`, { headers })
    check(res, { ok: (r) => r.status === 200 })
  } else {
    const res = http.get(`${medusaUrl()}/store/search?q=geschiedenis&limit=10`, { headers })
    check(res, { ok: (r) => r.status === 200 })
  }
  sleep(0.2)
}
