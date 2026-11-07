import http from 'k6/http'
import { check, sleep } from 'k6'
import { medusaHeaders, medusaUrl, baseUrl } from '../lib/env.js'

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
}

let variantId = null

export function setup() {
  const headers = medusaHeaders()
  const list = http.get(`${medusaUrl()}/store/events?limit=5&sort=order`, { headers })
  const events = list.json('events') || []
  const handle = events[0]?.handle
  if (!handle) return {}
  const detail = http.get(`${medusaUrl()}/store/events/${encodeURIComponent(handle)}`, { headers })
  const event = detail.json('event')
  const variant = event?.variants?.[0]
  return { variantId: variant?.id, handle }
}

export default function (data) {
  if (!data.variantId) return
  const headers = medusaHeaders()
  const regionRes = http.get(`${medusaUrl()}/store/regions`, { headers })
  const regionId = regionRes.json('regions')?.[0]?.id
  if (!regionId) return

  const cartRes = http.post(
    `${medusaUrl()}/store/carts`,
    JSON.stringify({ region_id: regionId }),
    { headers }
  )
  const cartId = cartRes.json('cart')?.id
  check(cartRes, { cart: () => !!cartId })

  if (cartId) {
    http.post(
      `${medusaUrl()}/store/carts/${cartId}/line-items`,
      JSON.stringify({ variant_id: data.variantId, quantity: 1 }),
      { headers }
    )
  }

  if (data.handle) {
    http.get(`${baseUrl()}/winkelwagen`)
  }
  sleep(1)
}
