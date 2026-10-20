/** Logical freshness window; worker rebuilds when age exceeds this or slot is dirty. */
export function listingCacheTtlSec(): number {
  const n = Number(process.env.LISTING_CACHE_TTL_SEC)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 120
}

/** Physical Redis TTL for listing blobs (fallback when persist is unavailable). Default 7 days. */
export function listingCacheHardTtlSec(): number {
  const n = Number(process.env.LISTING_CACHE_HARD_TTL_SEC)
  if (Number.isFinite(n) && n > 0) return Math.floor(n)
  return 604_800
}

/** Worker job cadence hint (seconds); cron runs every minute minimum unless 6-field cron is supported. */
export function listingCacheRefreshIntervalSec(): number {
  const n = Number(process.env.LISTING_CACHE_REFRESH_INTERVAL_SEC)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30
}

export type ListingCacheEnvelope<T> = { value: T; builtAt: number }

export function isListingCacheEnvelope<T>(candidate: unknown): candidate is ListingCacheEnvelope<T> {
  return (
    !!candidate &&
    typeof candidate === "object" &&
    typeof (candidate as ListingCacheEnvelope<T>).builtAt === "number" &&
    "value" in (candidate as ListingCacheEnvelope<T>)
  )
}

export function isListingSnapshotStale(builtAt: number, now = Date.now()): boolean {
  if (!Number.isFinite(builtAt) || builtAt <= 0) return true
  return now - builtAt >= listingCacheTtlSec() * 1000
}

export type ShouldRebuildSlotInput = {
  dirty: boolean
  builtAt: number | null
  now?: number
  ttlSec?: number
}

/** Pure helper for the worker refresh job. */
export function shouldRebuildSlot(input: ShouldRebuildSlotInput): boolean {
  if (input.dirty) return true
  const builtAt = input.builtAt
  if (builtAt == null || !Number.isFinite(builtAt) || builtAt <= 0) return true
  const now = input.now ?? Date.now()
  const ttlMs = (input.ttlSec ?? listingCacheTtlSec()) * 1000
  return now - builtAt >= ttlMs
}

/** PDP Redis TTL (explicit invalidation on product change). HTTP Cache-Control stays short. */
export function eventDetailCacheTtlSec(): number {
  const n = Number(process.env.EVENT_DETAIL_CACHE_TTL_SEC)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 86_400
}

export const EVENT_DETAIL_NEGATIVE_CACHE_SEC = 60
