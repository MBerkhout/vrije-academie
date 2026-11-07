const SENSITIVE_KEYS =
  /^(password|token|secret|authorization|cookie|email|phone|iban|card|payment|otp)$/i
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

function scrubValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(EMAIL_RE, '[email]')
  }
  if (Array.isArray(value)) {
    return value.map(scrubValue)
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.test(key) ? '[Filtered]' : scrubValue(val)
    }
    return out
  }
  return value
}

/** Sentry `beforeSend` — strips PII from request headers and extras. */
export function scrubSentryEvent<T extends { request?: { headers?: Record<string, string> }; extra?: Record<string, unknown>; contexts?: Record<string, unknown> }>(
  event: T,
): T | null {
  if (event.request?.headers) {
    const headers = { ...event.request.headers }
    for (const key of Object.keys(headers)) {
      if (/authorization|cookie/i.test(key)) {
        headers[key] = '[Filtered]'
      }
    }
    event.request.headers = headers
  }
  if (event.extra) {
    event.extra = scrubValue(event.extra) as Record<string, unknown>
  }
  if (event.contexts) {
    event.contexts = scrubValue(event.contexts) as Record<string, unknown>
  }
  return event
}
