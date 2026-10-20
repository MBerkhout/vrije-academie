import type { MedusaContainer } from "@medusajs/framework/types"

import {
  listingCacheTtlSec,
  shouldRebuildSlot,
} from "../lib/listing-cache-config"
import { revalidateStorefrontPlpCache } from "../lib/storefront-revalidate"
import {
  buildAgendaSnapshot,
  buildPlpSnapshot,
  buildRegistrationCounts,
  buildVathuisSnapshot,
  logListingCache,
} from "../lib/store-listing-snapshot"
import {
  clearListingSlotDirty,
  getListingBuiltAt,
  persistListingSnapshot,
  redisIsDirty,
  redisKeyForListingSlot,
  tryAcquireListingBuildLock,
  type ListingMemorySlot,
} from "../lib/store-listing-redis"

type SlotConfig = {
  slot: ListingMemorySlot
  build: (scope: MedusaContainer) => Promise<unknown>
}

const SLOTS: SlotConfig[] = [
  { slot: "plp", build: (scope) => buildPlpSnapshot(scope) },
  { slot: "agenda", build: (scope) => buildAgendaSnapshot(scope) },
  { slot: "vathuis", build: (scope) => buildVathuisSnapshot(scope) },
  { slot: "registrations", build: (scope) => buildRegistrationCounts(scope) },
]

async function refreshSlotIfNeeded(
  container: MedusaContainer,
  { slot, build }: SlotConfig
): Promise<boolean> {
  const redisKey = redisKeyForListingSlot(slot)
  const [dirty, builtAt] = await Promise.all([
    redisIsDirty(slot),
    getListingBuiltAt(redisKey),
  ])

  if (!shouldRebuildSlot({ dirty, builtAt, ttlSec: listingCacheTtlSec() })) {
    return false
  }

  if (!(await tryAcquireListingBuildLock(slot))) {
    return false
  }

  const buildStart = Date.now()
  try {
    const value = await build(container)
    const builtAtNow = Date.now()
    await persistListingSnapshot(redisKey, slot, value, builtAtNow)
    await clearListingSlotDirty(slot)
    logListingCache(slot, "rebuild", Date.now() - buildStart)
    return slot === "plp"
  } catch {
    return false
  }
}

export async function refreshStoreListingSnapshots(container: MedusaContainer): Promise<void> {
  let plpRebuilt = false
  for (const config of SLOTS) {
    const rebuilt = await refreshSlotIfNeeded(container, config)
    if (rebuilt) plpRebuilt = true
  }
  if (plpRebuilt) {
    await revalidateStorefrontPlpCache()
  }
}

export default async function refreshStoreListingSnapshotsJob(container: MedusaContainer) {
  await refreshStoreListingSnapshots(container)
}

/** Runs every minute; dirty slots rebuild as soon as the job fires (coalesces import bursts). */
export const config = {
  name: "refresh-store-listing-snapshots",
  schedule: "* * * * *",
}
