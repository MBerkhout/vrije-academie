import { isStorefrontVisibleVariant } from "./salesforce-visible-on-website"

/** Event item row with fields used for storefront future/availability checks. */
export type EventItemSessionRow = {
  start_at?: string | null
  available_quantity?: number | null
}

export type EventItemListingRow = EventItemSessionRow & {
  delivery_type?: string | null
  city?: string | null
  city_slug?: string | null
}

/** Session is bookable/listable when start_at is absent (on-demand) or in the future. */
export function isFutureSession(
  ei: EventItemSessionRow,
  nowMs: number = Date.now()
): boolean {
  const start = ei.start_at
  if (!start) return true
  return new Date(start).getTime() >= nowMs
}

export function isOnlineLikeDeliveryType(
  deliveryType: string | null | undefined
): boolean {
  return deliveryType === "online" || deliveryType === "pre_recorded"
}

/** Offline session is listable on Ons aanbod when start_at is absent or in the future. */
export function isFutureOfflineSession(
  ei: EventItemListingRow,
  nowMs: number = Date.now()
): boolean {
  if (ei.delivery_type !== "offline") return false
  return isFutureSession(ei, nowMs)
}

/**
 * Ons aanbod product listing: online / pre_recorded products always pass;
 * products with only on-site sessions require at least one future offline session.
 */
export function productEligibleForEventsListing(
  eventItems: EventItemListingRow[],
  now: Date = new Date()
): boolean {
  if (!eventItems.length) return true
  if (eventItems.some((ei) => isOnlineLikeDeliveryType(ei.delivery_type))) return true
  const nowMs = now.getTime()
  return eventItems.some((ei) => isFutureOfflineSession(ei, nowMs))
}

/** Future on-site sessions used for PLP city / day_part / earliest_start_at aggregates. */
export function futureOfflineSessionsForListing(
  eventItems: EventItemListingRow[],
  now: Date = new Date()
): EventItemListingRow[] {
  const nowMs = now.getTime()
  return eventItems.filter((ei) => isFutureOfflineSession(ei, nowMs))
}

/** Future bookable sessions (available_quantity > 0) for PLP listing aggregates. */
export function futureAvailableSessionsForListing(
  eventItems: EventItemListingRow[],
  now: Date = new Date()
): EventItemListingRow[] {
  const nowMs = now.getTime()
  return eventItems.filter((ei) => {
    const qty = Number(ei.available_quantity ?? 0)
    if (qty <= 0) return false
    return isFutureSession(ei, nowMs)
  })
}

/**
 * True when the product has at least one bookable future session:
 * - available_quantity > 0
 * - start_at is missing (on-demand) or start_at >= now
 */
export function productHasFutureAvailableSession(
  eventItems: EventItemSessionRow[],
  now: Date = new Date()
): boolean {
  if (!eventItems.length) return false
  const nowMs = now.getTime()
  return eventItems.some((ei) => {
    const qty = Number(ei.available_quantity ?? 0)
    if (qty <= 0) return false
    return isFutureSession(ei, nowMs)
  })
}

/**
 * Ons aanbod listing: keep published groups that have no public sessions
 * (hidden Salesforce children / Externe verhuur only). Still require a
 * bookable future session when any public event items exist.
 */
export function productEligibleForPlpListing(
  eventItems: EventItemSessionRow[],
  now: Date = new Date()
): boolean {
  if (!eventItems.length) return true
  return productHasFutureAvailableSession(eventItems, now)
}

/** Storefront variant rows: keep non-event variants; drop hidden and past sessions. */
export function filterVariantsWithFutureSessions<
  T extends {
    event_item?: EventItemSessionRow | null
    metadata?: Record<string, unknown> | null
  },
>(variants: T[], now: Date = new Date()): T[] {
  const nowMs = now.getTime()
  return variants.filter((v) => {
    if (!isStorefrontVisibleVariant(v)) return false
    return !v.event_item || isFutureSession(v.event_item, nowMs)
  })
}

/** Fisher–Yates shuffle (returns new array). */
export function shuffleInPlace<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
