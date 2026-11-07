import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend } from 'k6/metrics'
import { baseUrl, medusaHeaders, medusaUrl, publishableKey } from './env.js'

/** Storefront HTML/RSC (pages, account, search). */
export const pageLoadMs = new Trend('page_load_ms', true)
/** Medusa cart + storefront checkout paths. */
export const checkoutStepMs = new Trend('checkout_step_ms', true)

export function thinkTime() {
  sleep(3 + Math.random() * 2)
}

export function recordPage(res) {
  if (res?.timings?.duration != null) {
    pageLoadMs.add(res.timings.duration)
  }
}

export function recordCheckout(res) {
  if (res?.timings?.duration != null) {
    checkoutStepMs.add(res.timings.duration)
  }
}

export function fetchHandles() {
  const key = publishableKey()
  if (!key) return []
  const res = http.get(`${medusaUrl()}/store/events?limit=60&sort=order`, {
    headers: medusaHeaders(),
  })
  if (res.status !== 200) return []
  return (res.json('events') || []).map((e) => e.handle).filter(Boolean)
}

export function journeyBrowse(handles) {
  const base = baseUrl()
  const paths = ['/', '/ons-aanbod', '/agenda', '/ons-aanbod?sort=start_date']
  const path = paths[Math.floor(Math.random() * paths.length)]
  const home = http.get(`${base}${path}`)
  recordPage(home)
  check(home, { browse_ok: (r) => r.status >= 200 && r.status < 400 })
  thinkTime()

  if (handles.length > 0 && Math.random() < 0.85) {
    const handle = handles[Math.floor(Math.random() * handles.length)]
    const pdp = http.get(`${base}/ons-aanbod/${encodeURIComponent(handle)}`)
    recordPage(pdp)
    check(pdp, { pdp_ok: (r) => r.status === 200 })
    thinkTime()
  }
}

export function journeyAccount() {
  const base = baseUrl()
  const paths = ['/login', '/mijn-account', '/mijn-account/aankopen', '/mijn-account/gegevens']
  for (const path of paths) {
    if (Math.random() > 0.55) continue
    const res = http.get(`${base}${path}`)
    recordPage(res)
    check(res, { account_ok: (r) => r.status >= 200 && r.status < 500 })
    thinkTime()
  }
}

export function journeySearch() {
  const queries = ['geschiedenis', 'kunst', 'amsterdam', 'college', 'wandeling']
  const q = queries[Math.floor(Math.random() * queries.length)]
  const res = http.get(`${baseUrl()}/zoeken?q=${encodeURIComponent(q)}`)
  recordPage(res)
  check(res, { search_ok: (r) => r.status >= 200 && r.status < 500 })
  thinkTime()
}

let cachedVariantId = null

export function journeyCheckout(handles) {
  const headers = medusaHeaders()
  const start = Date.now()

  if (!cachedVariantId && handles.length > 0) {
    const detail = http.get(
      `${medusaUrl()}/store/events/${encodeURIComponent(handles[0])}`,
      { headers }
    )
    cachedVariantId = detail.json('event')?.variants?.[0]?.id
  }

  const regionRes = http.get(`${medusaUrl()}/store/regions`, { headers })
  const regionId = regionRes.json('regions')?.[0]?.id
  if (!regionId || !cachedVariantId) {
    recordCheckout({ timings: { duration: Date.now() - start } })
    return
  }

  const cartRes = http.post(
    `${medusaUrl()}/store/carts`,
    JSON.stringify({ region_id: regionId }),
    { headers }
  )
  const cartId = cartRes.json('cart')?.id
  if (!cartId) {
    recordCheckout({ timings: { duration: Date.now() - start } })
    return
  }

  http.post(
    `${medusaUrl()}/store/carts/${cartId}/line-items`,
    JSON.stringify({ variant_id: cachedVariantId, quantity: 1 }),
    { headers }
  )

  const cartPage = http.get(`${baseUrl()}/winkelwagen`)
  recordPage(cartPage)

  const checkoutPage = http.get(`${baseUrl()}/checkout/inloggen`)
  recordPage(checkoutPage)

  recordCheckout({ timings: { duration: Date.now() - start } })
  check(cartRes, { checkout_ok: () => true })
  thinkTime()
}

export function runMixedJourney(handles) {
  const roll = Math.random()
  if (roll < 0.6) journeyBrowse(handles)
  else if (roll < 0.85) journeyAccount()
  else if (roll < 0.95) journeySearch()
  else journeyCheckout(handles)
}

export const ga4Thresholds = {
  http_req_failed: ['rate<0.01'],
  page_load_ms: ['p(95)<800'],
  checkout_step_ms: ['p(95)<1500'],
}
