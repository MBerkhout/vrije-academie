import type { MedusaContainer } from "@medusajs/framework/types"

import { rebuildEventDetail } from "../lib/event-detail-rebuild"
import { shouldRebuildEventDetail } from "../lib/listing-cache-config"
import { PLP_TOP_SLOT_COUNT } from "../lib/store-listing-redis"
import {
  getEventDetailBuiltAt,
  redisIsEventDetailDirty,
} from "../lib/store-listing-redis"
import { getPlpListingSnapshot } from "../lib/store-listing-snapshot"

async function refreshHandleIfNeeded(
  container: MedusaContainer,
  handle: string
): Promise<void> {
  const trimmed = handle.trim()
  if (!trimmed) return
  const [dirty, builtAt] = await Promise.all([
    redisIsEventDetailDirty(trimmed),
    getEventDetailBuiltAt(trimmed),
  ])
  if (!shouldRebuildEventDetail({ dirty, builtAt })) return
  await rebuildEventDetail(container, trimmed, { revalidateStorefront: true })
}

export async function refreshEventDetailSnapshots(container: MedusaContainer): Promise<void> {
  const plp = await getPlpListingSnapshot(container)
  const handles = plp.list
    .slice(0, PLP_TOP_SLOT_COUNT)
    .map((row) => {
      const h = (row as { handle?: unknown }).handle
      return typeof h === "string" ? h.trim() : ""
    })
    .filter(Boolean)

  for (const handle of handles) {
    await refreshHandleIfNeeded(container, handle)
  }
}

export default async function refreshEventDetailSnapshotsJob(container: MedusaContainer) {
  await refreshEventDetailSnapshots(container)
}

export const config = {
  name: "refresh-event-detail-snapshots",
  schedule: "* * * * *",
}
