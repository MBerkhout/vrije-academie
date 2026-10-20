import { describe, expect, it } from "vitest"

import {
  isForcedListingRefresh,
  isListingSnapshotStale,
  LISTING_SNAPSHOT_STALE_BUILT_AT,
  listingCacheTtlSec,
} from "./listing-cache-config"

describe("listing-cache-config", () => {
  it("treats builtAt 0 as forced stale", () => {
    expect(isForcedListingRefresh(LISTING_SNAPSHOT_STALE_BUILT_AT)).toBe(true)
    expect(isListingSnapshotStale(LISTING_SNAPSHOT_STALE_BUILT_AT, 1_000_000)).toBe(true)
  })

  it("respects TTL window for fresh snapshots", () => {
    const ttlMs = listingCacheTtlSec() * 1000
    const now = 10_000_000
    expect(isListingSnapshotStale(now - ttlMs + 1, now)).toBe(false)
    expect(isListingSnapshotStale(now - ttlMs, now)).toBe(true)
  })
})
