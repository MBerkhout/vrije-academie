import { createClient } from "redis"

import { invalidateBaseEventDataCache } from "./store-query-cache"
import {
  isListingCacheEnvelope,
  LISTING_SNAPSHOT_STALE_BUILT_AT,
  listingCacheHardTtlSec,
  listingCacheTtlSec,
  type ListingCacheEnvelope,
} from "./listing-cache-config"

/** Bump when listing snapshot shape or eligibility rules change so stale Redis rows are ignored. */
const LISTING_SNAPSHOT_VERSION = 5

export const REDIS_KEY_PLP = `store:listing:plp:v${LISTING_SNAPSHOT_VERSION}`
export const REDIS_KEY_AGENDA = `store:listing:agenda:v${LISTING_SNAPSHOT_VERSION}`
export const REDIS_KEY_VATHUIS = `store:listing:vathuis:v${LISTING_SNAPSHOT_VERSION}`
export const REDIS_KEY_REGISTRATIONS = "store:listing:registrations"

/** @deprecated Use `listingCacheTtlSec()` — kept for HTTP cache headers that read at request time. */
export const LISTING_CACHE_TTL_SEC = listingCacheTtlSec()

export const EVENT_CACHE_TTL_SEC = listingCacheTtlSec()

export { listingCacheHardTtlSec, listingCacheTtlSec } from "./listing-cache-config"

/** First page size on default `/ons-aanbod` — bust listing cache when these products change. */
export const PLP_TOP_SLOT_COUNT = 24

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

export async function redisSetJson(
  key: string,
  value: unknown,
  ttlSec = listingCacheHardTtlSec()
): Promise<void> {
  const client = await getRedisClient()
  if (!client) return
  try {
    await client.setEx(key, ttlSec, JSON.stringify(value))
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

async function markListingEnvelopeStale(
  redisKey: string,
  memorySlot: keyof typeof memoryCaches
): Promise<void> {
  const fromRedis = await redisGetJson<ListingCacheEnvelope<unknown>>(redisKey)
  const fromMemory = memoryGet<ListingCacheEnvelope<unknown>>(memorySlot)
  const candidate = fromRedis ?? fromMemory

  if (isListingCacheEnvelope(candidate)) {
    const stale: ListingCacheEnvelope<unknown> = {
      value: candidate.value,
      builtAt: LISTING_SNAPSHOT_STALE_BUILT_AT,
    }
    memorySet(memorySlot, stale)
    await redisSetJson(redisKey, stale, listingCacheHardTtlSec())
    return
  }

  memorySet(memorySlot, null)
}

/**
 * Mark PLP/agenda/vathuis snapshots stale (keep serving last value, rebuild in background).
 * Does not delete Redis keys — avoids cold snapshot builds on the next request.
 */
export async function invalidateStoreListingCache(): Promise<void> {
  await Promise.all([
    markListingEnvelopeStale(REDIS_KEY_PLP, "plp"),
    markListingEnvelopeStale(REDIS_KEY_AGENDA, "agenda"),
    markListingEnvelopeStale(REDIS_KEY_VATHUIS, "vathuis"),
  ])
  invalidateBaseEventDataCache()
}

/** Drop registration-count cache only (orders); PLP default sort does not use counts. */
export async function invalidateRegistrationCountsCache(): Promise<void> {
  await markListingEnvelopeStale(REDIS_KEY_REGISTRATIONS, "registrations")
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
  memoryCaches.registrations = null

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
    found.add(REDIS_KEY_PLP)
    found.add(REDIS_KEY_AGENDA)
    found.add(REDIS_KEY_VATHUIS)
    found.add(REDIS_KEY_REGISTRATIONS)
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
 * In-process fallback when Redis is unavailable (also cleared on invalidation). Holds the same
 * `{ value, builtAt }` envelope written to Redis by `loadCached`; it never expires on its own —
 * it's always superseded by the next successful rebuild, so a stale entry can still be served
 * instantly while that rebuild runs.
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
