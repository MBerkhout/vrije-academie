import { hasAttributionConsent } from '@/lib/analytics/consent/state'
import { createAnalyticsEventId, getOrCreateCheckoutEventId } from '@/lib/analytics/event-id'

export type CheckoutAttribution = {
  event_id: string
  client_id?: string
  session_id?: string
  fbp?: string
  fbc?: string
  gclid?: string
  ttclid?: string
  user_agent?: string
  page_location?: string
  captured_at: string
  payment_type?: string
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  if (!match?.[1]) return undefined
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

function gaClientIdFromGaCookie(): string | undefined {
  const raw = readCookie('_ga')
  if (!raw) return undefined
  const parts = raw.split('.')
  if (parts.length >= 4) return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`
  return undefined
}

function gaSessionIdFromCookies(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const cookies = document.cookie.split(';')
  for (const chunk of cookies) {
    const trimmed = chunk.trim()
    if (!trimmed.startsWith('_ga_')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const value = trimmed.slice(eq + 1)
    const sessionMatch = value.match(/\.s(\d+)/)
    if (sessionMatch?.[1]) return sessionMatch[1]
  }
  return undefined
}

function fbcFromFbclid(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const params = new URLSearchParams(window.location.search)
    const fbclid = params.get('fbclid')?.trim()
    if (!fbclid) return undefined
    return `fb.1.${Date.now()}.${fbclid}`
  } catch {
    return undefined
  }
}

function clickIdsFromLocation(): { gclid?: string; ttclid?: string } {
  if (typeof window === 'undefined') return {}
  try {
    const params = new URLSearchParams(window.location.search)
    const gclid = params.get('gclid')?.trim()
    const ttclid = params.get('ttclid')?.trim()
    return {
      ...(gclid ? { gclid } : {}),
      ...(ttclid ? { ttclid } : {}),
    }
  } catch {
    return {}
  }
}

/**
 * Collect checkout attribution for server-side purchase (stored on cart.metadata.analytics).
 * Returns minimal payload when consent is denied (event_id + page only).
 */
export function collectCheckoutAttribution(options?: {
  paymentType?: string
  eventId?: string
}): CheckoutAttribution {
  const event_id = options?.eventId ?? getOrCreateCheckoutEventId()
  const page_location =
    typeof window !== 'undefined' ? window.location.href : undefined

  const base: CheckoutAttribution = {
    event_id,
    captured_at: new Date().toISOString(),
    ...(page_location ? { page_location } : {}),
    ...(options?.paymentType ? { payment_type: options.paymentType } : {}),
  }

  if (!hasAttributionConsent()) {
    return base
  }

  const fbp = readCookie('_fbp')
  const fbc = readCookie('_fbc') ?? fbcFromFbclid()
  const clickIds = clickIdsFromLocation()

  return {
    ...base,
    client_id: gaClientIdFromGaCookie(),
    session_id: gaSessionIdFromCookies(),
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
    ...clickIds,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  }
}

/** Event id for engagement events (login, sign_up, add_to_cart). */
export function createEngagementEventId(): string {
  return createAnalyticsEventId()
}
