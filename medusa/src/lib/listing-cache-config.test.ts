import { describe, expect, it } from "vitest"

import {
  isListingSnapshotStale,
  listingCacheTtlSec,
  shouldRebuildSlot,
} from "./listing-cache-config"

describe("listing-cache-config", () => {
  it("respects TTL window for fresh snapshots", () => {
    const ttlMs = listingCacheTtlSec() * 1000
    const now = 10_000_000
    expect(isListingSnapshotStale(now - ttlMs + 1, now)).toBe(false)
    expect(isListingSnapshotStale(now - ttlMs, now)).toBe(true)
  })

  it("treats missing or zero builtAt as stale", () => {
    expect(isListingSnapshotStale(0, 1_000_000)).toBe(true)
  })

  it("shouldRebuildSlot when dirty", () => {
    expect(shouldRebuildSlot({ dirty: true, builtAt: Date.now() })).toBe(true)
  })

  it("shouldRebuildSlot when builtAt missing or aged out", () => {
    const now = 1_000_000
    const ttlSec = 120
    expect(shouldRebuildSlot({ dirty: false, builtAt: null, now, ttlSec })).toBe(true)
    expect(shouldRebuildSlot({ dirty: false, builtAt: 0, now, ttlSec })).toBe(true)
    expect(
      shouldRebuildSlot({
        dirty: false,
        builtAt: now - ttlSec * 1000,
        now,
        ttlSec,
      })
    ).toBe(true)
    expect(
      shouldRebuildSlot({
        dirty: false,
        builtAt: now - ttlSec * 1000 + 1,
        now,
        ttlSec,
      })
    ).toBe(false)
  })
})
