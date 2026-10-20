/** Logical freshness window; stale entries are still served while rebuilding. */
export function listingCacheTtlSec(): number {
  const n = Number(process.env.LISTING_CACHE_TTL_SEC)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 120
}

/** Physical Redis TTL — keeps stale envelopes available for SWR. */
export function listingCacheHardTtlSec(): number {
  const n = Number(process.env.LISTING_CACHE_HARD_TTL_SEC)
  if (Number.isFinite(n) && n > 0) return Math.floor(n)
  return listingCacheTtlSec() * 6
}

/** Minimum time between snapshot rebuilds (rate limit under load). */
export function listingCacheRebuildMinIntervalSec(): number {
  const n = Number(process.env.LISTING_CACHE_REBUILD_MIN_INTERVAL_SEC)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 60
}

/** `builtAt` value that forces background refresh without deleting `value`. */
export const LISTING_SNAPSHOT_STALE_BUILT_AT = 0

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
  if (builtAt === LISTING_SNAPSHOT_STALE_BUILT_AT) return true
  return now - builtAt >= listingCacheTtlSec() * 1000
}

export function isForcedListingRefresh(builtAt: number): boolean {
  return builtAt === LISTING_SNAPSHOT_STALE_BUILT_AT
}
