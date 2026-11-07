export function env(name, fallback = '') {
  return (__ENV[name] || fallback).trim()
}

export function baseUrl() {
  return env('BASE_URL', 'http://127.0.0.1:3000').replace(/\/$/, '')
}

export function medusaUrl() {
  return env('MEDUSA_URL', 'http://127.0.0.1:9000').replace(/\/$/, '')
}

export function publishableKey() {
  return env('PUBLISHABLE_KEY')
}

export function medusaHeaders() {
  const key = publishableKey()
  const h = { 'Content-Type': 'application/json' }
  if (key) h['x-publishable-api-key'] = key
  return h
}
