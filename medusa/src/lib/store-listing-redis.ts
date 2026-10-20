import { createClient } from "redis"

import { invalidateBaseEventDataCache } from "./store-query-cache"
import {
  isListingCacheEnvelope,
  listingCacheHardTtlSec,
  listingCacheTtlSec,
  type ListingCacheEnvelope,
} from "./listing-cache-config"

/** Bump when listing snapshot shape or eligibility rules change so stale Redis rows are ignored. */
const LISTING_SNAPSHOT_VERSION = 6

export const REDIS_KEY_PLP = `store:listing:plp:v${LISTING_SNAPSHOT_VERSION}`
export const REDIS_KEY_AGENDA = `store:listing:agenda:v${LISTING_SNAPSHOT_VERSION}`
export const REDIS_KEY_VATHUIS = `store:listing:vathuis:v${LISTING_SNAPSHOT_VERSION}`
export const REDIS_KEY_REGISTRATIONS = `store:listing:registrations:v${LISTING_SNAPSHOT_VERSION}`

export type ListingMemorySlot = "plp" | "agenda" | "vathuis" | "registrations"

const LISTING_SLOT_TO_REDIS: Record<ListingMemorySlot, string> = {
  plp: REDIS_KEY_PLP,
  agenda: REDIS_KEY_AGENDA,
  vathuis: REDIS_KEY_VATHUIS,
  registrations: REDIS_KEY_REGISTRATIONS,
}

/** @deprecated Use `listingCacheTtlSec()` — kept for HTTP cache headers that read at request time. */
export const LISTING_CACHE_TTL_SEC = listingCacheTtlSec()

export const EVENT_CACHE_TTL_SEC = listingCacheTtlSec()

export { listingCacheHardTtlSec, listingCacheTtlSec } from "./listing-cache-config"

/** First page size on default `/ons-aanbod` — bust listing cache when these products change. */
export const PLP_TOP_SLOT_COUNT = 24

export function listingBuiltAtRedisKey(redisKey: string): string {
  return `${redisKey}:built_at`
}

export function listingDirtyRedisKey(slot: ListingMemorySlot): string {
  return `store:listing:dirty:${slot}`
}

export function listingBuildLockKey(slot: ListingMemorySlot): string {
  return `store:listing:build:${slot}`
}

export function eventDetailRedisKey(handle: string): string {
  return `store:event:detail:${handle}`
}

/** Prefixes flushed by `npm run cache:flush`. Does not touch Medusa workflow/job keys. */
export const STOREFRONT_REDIS_KEY_PATTERNS = [
  "store:listing:*",
  "store:event:detail:*",
] as const

type RedisClient = ReturnType<typeof createClient>

let redisClient: RedisClient | null = null
let redisConnect: Promise<RedisClient | null> | null = null

/** Lazy Redis client; returns null when REDIS_URL is unset (dev without Redis). */
export async function getRedisClient(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL?.trim()
  if (!url) return null

  if (redisClient?.isOpen) return redisClient

  if (!redisConnect) {
    redisConnect = (async () => {
      try {
        const client = createClient({ url })
        client.on("error", () => {})
        await client.connect()
        redisClient = client
        return client
      } catch {
        redisConnect = null
        return null
      }
    })()
  }

  return redisConnect
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const client = await getRedisClient()
  if (!client) return null
  try {
    const raw = await client.get(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function redisGetNumber(key: string): Promise<number | null> {
  const client = await getRedisClient()
  if (!client) return null
  try {
    const raw = await client.get(key)
    if (raw == null || raw === "") return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export async function redisSetJson(
  key: string,
  value: unknown,
  ttlSec = listingCacheHardTtlSec()
): Promise<void> {
  const client = await getRedisClient()
  if (!client) return
  try {
    const payload = JSON.stringify(value)
    if (ttlSec > 0) {
      await client.setEx(key, ttlSec, payload)
    } else {
      await client.set(key, payload)
    }
  } catch {
    /* ignore */
  }
}

export async function redisSetString(
  key: string,
  value: string,
  ttlSec?: number
): Promise<void> {
  const client = await getRedisClient()
  if (!client) return
  try {
    if (ttlSec != null && ttlSec > 0) {
      await client.setEx(key, ttlSec, value)
    } else {
      await client.set(key, value)
    }
  } catch {
    /* ignore */
  }
}

export async function redisDeleteKey(key: string): Promise<void> {
  const client = await getRedisClient()
  if (!client) return
  try {
    await client.del(key)
  } catch {
    /* ignore */
  }
}

export async function redisIsDirty(slot: ListingMemorySlot): Promise<boolean> {
  const client = await getRedisClient()
  if (!client) return false
  try {
    const v = await client.get(listingDirtyRedisKey(slot))
    return v != null && v !== ""
  } catch {
    return false
  }
}

export async function markListingSlotsDirty(slots: ListingMemorySlot[]): Promise<void> {
  const client = await getRedisClient()
  if (!client) {
    return
  }
  try {
    await Promise.all(slots.map((slot) => client.set(listingDirtyRedisKey(slot), "1")))
  } catch {
    /* ignore */
  }
}

export async function clearListingSlotDirty(slot: ListingMemorySlot): Promise<void> {
  await redisDeleteKey(listingDirtyRedisKey(slot))
}

export async function getListingBuiltAt(redisKey: string): Promise<number | null> {
  return redisGetNumber(listingBuiltAtRedisKey(redisKey))
}

export async function getListingSnapshotValue<T>(redisKey: string): Promise<T | null> {
  return redisGetJson<T>(redisKey)
}

export async function persistListingSnapshot<T>(
  redisKey: string,
  memorySlot: ListingMemorySlot,
  value: T,
  builtAt: number
): Promise<void> {
  const envelope: ListingCacheEnvelope<T> = { value, builtAt }
  memorySet(memorySlot, envelope)
  const hardTtl = listingCacheHardTtlSec()
  await redisSetJson(redisKey, value, hardTtl)
  await redisSetString(listingBuiltAtRedisKey(redisKey), String(builtAt), hardTtl)
}

export async function tryAcquireListingBuildLock(
  slot: ListingMemorySlot,
  ttlSec = 120
): Promise<boolean> {
  const client = await getRedisClient()
  if (!client) return true
  try {
    const result = await client.set(listingBuildLockKey(slot), "1", { NX: true, EX: ttlSec })
    return result === "OK"
  } catch {
    return false
  }
}

/**
 * Mark PLP/agenda/vathuis for worker rebuild (dirty flag). Does not read or rewrite blobs.
 */
export async function invalidateStoreListingCache(): Promise<void> {
  await markListingSlotsDirty(["plp", "agenda", "vathuis"])
  invalidateBaseEventDataCache()
}

/** Drop registration-count cache only (orders); PLP default sort does not use counts. */
export async function invalidateRegistrationCountsCache(): Promise<void> {
  await markListingSlotsDirty(["registrations"])
}

export async function invalidateEventDetailCache(handle: string): Promise<void> {
  await redisDeleteKey(eventDetailRedisKey(handle))
}

async function scanKeys(client: RedisClient, match: string): Promise<string[]> {
  const keys: string[] = []
  for await (const key of client.scanIterator({ MATCH: match, COUNT: 200 })) {
    keys.push(String(key))
  }
  return keys
}

/**
 * Delete all storefront listing + event-detail Redis keys (including legacy unversioned
 * snapshots). In-memory fallbacks on this process are cleared too. Medusa workflow
 * keys are left alone. Returns `redis: false` when `REDIS_URL` is unset.
 */
export async function flushStorefrontRedisCache(): Promise<{
  redis: boolean
  deleted: number
  keys: string[]
}> {
  invalidateMemoryListingCaches()
  invalidateBaseEventDataCache()

  const client = await getRedisClient()
  if (!client) {
    return { redis: false, deleted: 0, keys: [] }
  }

  const found = new Set<string>()
  let scanned = false
  try {
    for (const pattern of STOREFRONT_REDIS_KEY_PATTERNS) {
      for (const key of await scanKeys(client, pattern)) {
        found.add(key)
      }
    }
    scanned = true
  } catch {
    /* SCAN unavailable — still delete the known listing keys */
  }
  if (!scanned) {
    for (const slot of Object.keys(LISTING_SLOT_TO_REDIS) as ListingMemorySlot[]) {
      const redisKey = LISTING_SLOT_TO_REDIS[slot]
      found.add(redisKey)
      found.add(listingBuiltAtRedisKey(redisKey))
      found.add(listingDirtyRedisKey(slot))
      found.add(listingBuildLockKey(slot))
    }
  }

  const keys = [...found]
  for (let i = 0; i < keys.length; i += 100) {
    const batch = keys.slice(i, i + 100)
    try {
      await client.del(batch)
    } catch {
      /* ignore */
    }
  }

  return { redis: true, deleted: keys.length, keys }
}

/**
 * In-process cache: API processes serve from memory and only re-fetch the Redis blob when
 * `built_at` changes (written by the worker refresh job).
 */
const memoryCaches = {
  plp: null as unknown,
  agenda: null as unknown,
  vathuis: null as unknown,
  registrations: null as unknown,
}

export function memoryGet<T>(slot: keyof typeof memoryCaches): T | null {
  return (memoryCaches[slot] as T | null) ?? null
}

export function memorySet(slot: keyof typeof memoryCaches, value: unknown): void {
  memoryCaches[slot] = value
}

export function invalidateMemoryListingCaches(): void {
  memoryCaches.plp = null
  memoryCaches.agenda = null
  memoryCaches.vathuis = null
  memoryCaches.registrations = null
}

export function redisKeyForListingSlot(slot: ListingMemorySlot): string {
  return LISTING_SLOT_TO_REDIS[slot]
}
