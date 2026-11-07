/** Stable random id for GA4/Meta deduplication (browser + server). */
export function createAnalyticsEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `va-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

const CHECKOUT_EVENT_ID_KEY = 'va_checkout_event_id'

/** One event_id per checkout attempt (payment step → order complete). */
export function getOrCreateCheckoutEventId(): string {
  if (typeof window === 'undefined') return createAnalyticsEventId()
  try {
    const existing = sessionStorage.getItem(CHECKOUT_EVENT_ID_KEY)
    if (existing?.trim()) return existing.trim()
    const id = createAnalyticsEventId()
    sessionStorage.setItem(CHECKOUT_EVENT_ID_KEY, id)
    return id
  } catch {
    return createAnalyticsEventId()
  }
}

export function clearCheckoutEventId(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(CHECKOUT_EVENT_ID_KEY)
  } catch {
    // ignore
  }
}
