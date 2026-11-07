import type { MedusaContainer } from "@medusajs/framework/types"

import {
  buildStoreEventDetail,
  EVENT_DETAIL_NOT_FOUND,
} from "./store-event-detail"
import { shouldRebuildEventDetail } from "./listing-cache-config"
import { revalidateStorefrontPdpHandles } from "./storefront-revalidate"
import {
  clearEventDetailDirty,
  eventDetailRedisKey,
  getEventDetailBuiltAt,
  persistEventDetail,
  redisGetJson,
  redisIsEventDetailDirty,
  tryAcquireEventDetailBuildLock,
} from "./store-listing-redis"

const backgroundInflight = new Map<string, Promise<void>>()
const blockingInflight = new Map<string, Promise<Record<string, unknown> | null>>()

function logEventDetail(
  handle: string,
  outcome: "hit" | "miss" | "rebuild",
  buildMs?: number
): void {
  if (outcome === "hit" && process.env.EVENT_DETAIL_CACHE_LOG_HITS !== "true") return
  console.info(
    JSON.stringify({
      tag: "event-detail-cache",
      handle,
      outcome,
      ...(buildMs !== undefined ? { buildMs } : {}),
    })
  )
}

async function persistBuilt(
  handle: string,
  built: Record<string, unknown> | null
): Promise<void> {
  const builtAt = Date.now()
  if (built) {
    await persistEventDetail(handle, built, builtAt)
  } else {
    await persistEventDetail(handle, EVENT_DETAIL_NOT_FOUND, builtAt)
  }
  await clearEventDetailDirty(handle)
}

async function waitForPeerBuild(
  handle: string,
  attempts = 40,
  delayMs = 100
): Promise<Record<string, unknown> | null | undefined> {
  for (let i = 0; i < attempts; i += 1) {
    const cached = await redisGetJson<Record<string, unknown> | string>(eventDetailRedisKey(handle))
    if (cached === EVENT_DETAIL_NOT_FOUND) return null
    if (cached && typeof cached === "object") return cached
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return undefined
}

export async function rebuildEventDetail(
  scope: MedusaContainer,
  handle: string,
  options: { revalidateStorefront?: boolean } = {}
): Promise<Record<string, unknown> | null> {
  if (!(await tryAcquireEventDetailBuildLock(handle))) {
    const peer = await waitForPeerBuild(handle)
    if (peer !== undefined) return peer
    return null
  }
  const buildStart = Date.now()
  try {
    const built = await buildStoreEventDetail(scope, handle)
    await persistBuilt(handle, built)
    logEventDetail(handle, built ? "rebuild" : "miss", Date.now() - buildStart)
    if (options.revalidateStorefront && built) {
      await revalidateStorefrontPdpHandles([handle])
    }
    return built
  } catch {
    return null
  }
}

export function scheduleEventDetailRebuild(scope: MedusaContainer, handle: string): void {
  if (backgroundInflight.has(handle)) return
  const job = rebuildEventDetail(scope, handle, { revalidateStorefront: true })
    .then(() => undefined)
    .finally(() => {
      backgroundInflight.delete(handle)
    })
  backgroundInflight.set(handle, job)
}

async function buildBlocking(
  scope: MedusaContainer,
  handle: string
): Promise<Record<string, unknown> | null> {
  let inflight = blockingInflight.get(handle)
  if (!inflight) {
    inflight = rebuildEventDetail(scope, handle).finally(() => {
      blockingInflight.delete(handle)
    })
    blockingInflight.set(handle, inflight)
  }
  return inflight
}

export async function getCachedStoreEventDetail(
  scope: MedusaContainer,
  handle: string
): Promise<Record<string, unknown> | null> {
  const [cached, builtAt, dirty] = await Promise.all([
    redisGetJson<Record<string, unknown> | string>(eventDetailRedisKey(handle)),
    getEventDetailBuiltAt(handle),
    redisIsEventDetailDirty(handle),
  ])

  if (cached === EVENT_DETAIL_NOT_FOUND) return null

  if (cached && typeof cached === "object") {
    logEventDetail(handle, "hit")
    if (shouldRebuildEventDetail({ dirty, builtAt })) {
      scheduleEventDetailRebuild(scope, handle)
    }
    return cached
  }

  return buildBlocking(scope, handle)
}
