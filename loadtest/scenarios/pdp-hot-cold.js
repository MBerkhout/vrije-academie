import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend } from 'k6/metrics'
import { baseUrl, medusaHeaders, medusaUrl, env } from '../lib/env.js'

const pdpHot = new Trend('pdp_hot_ms', true)
const pdpCold = new Trend('pdp_cold_ms', true)

export const options = {
  scenarios: {
    hot: {
      executor: 'constant-vus',
      vus: 15,
      duration: '2m',
      exec: 'hotPdp',
    },
    cold: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      startTime: '10s',
      exec: 'coldPdp',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    pdp_hot_ms: ['p(95)<800'],
    pdp_cold_ms: ['p(95)<2000'],
  },
}

export function setup() {
  const fromEnv = env('PDP_HANDLES')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
  if (fromEnv.length > 0) return { handles: fromEnv, hot: fromEnv[0] }
  const res = http.get(`${medusaUrl()}/store/events?limit=30&sort=order`, {
    headers: medusaHeaders(),
  })
  const handles = (res.json('events') || []).map((e) => e.handle).filter(Boolean)
  return { handles, hot: handles[0] || 'demo' }
}

export function hotPdp(data) {
  const url = `${baseUrl()}/ons-aanbod/${encodeURIComponent(data.hot)}`
  const start = Date.now()
  const res = http.get(url)
  pdpHot.add(Date.now() - start)
  check(res, { ok: (r) => r.status === 200 })
  sleep(0.3)
}

export function coldPdp(data) {
  const list = data.handles || []
  if (list.length === 0) return
  const handle = list[Math.floor(Math.random() * list.length)]
  const start = Date.now()
  const res = http.get(`${baseUrl()}/ons-aanbod/${encodeURIComponent(handle)}`)
  pdpCold.add(Date.now() - start)
  check(res, { ok: (r) => r.status === 200 })
  sleep(0.8)
}
