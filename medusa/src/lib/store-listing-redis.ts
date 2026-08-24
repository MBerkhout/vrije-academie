import { createClient } from "redis"

export const REDIS_KEY_PLP = "store:listing:plp"
export const REDIS_KEY_AGENDA = "store:listing:agenda"
export const REDIS_KEY_VATHUIS = "store:listing:vathuis"
export const REDIS_KEY_REGISTRATIONS = "store:listing:registrations"

/** Hard cache for PLP/agenda snapshots and event detail (10 minutes). */
export const LISTING_CACHE_TTL_SEC = 600
export const EVENT_CACHE_TTL_SEC = LISTING_CACHE_TTL_SEC

/**
 * Physical Redis TTL for listing snapshots — well past `LISTING_CACHE_TTL_SEC` so a snapshot
 * that just went stale is still in Redis (and can be served instantly) while `loadCached`
 * refreshes it in the background. See `loadCached` in `store-listing-snapshot.ts`.
 */
export const LISTING_CACHE_HARD_TTL_SEC = LISTING_CACHE_TTL_SEC * 6

/** First page size on default `/ons-aanbod` — bust listing cache when these products change. */
export const PLP_TOP_SLOT_COUNT = 24

export function eventDetailRedisKey(handle: string): string {
  return `store:event:detail:${handle}`
}

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

export async function redisSetJson(key: string, value: unknown, ttlSec = LISTING_CACHE_TTL_SEC): Promise<void> {
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

/** Drop PLP/agenda/vathuis listing caches + in-memory fallbacks. */
export async function invalidateStoreListingCache(): Promise<void> {
  const client = await getRedisClient()
  if (client) {
    try {
      await client.del([
        REDIS_KEY_PLP,
        REDIS_KEY_AGENDA,
        REDIS_KEY_VATHUIS,
      ])
    } catch {
      /* ignore */
    }
  }
  invalidateMemoryListingCaches()
}

/** Drop registration-count cache only (orders); PLP default sort does not use counts. */
export async function invalidateRegistrationCountsCache(): Promise<void> {
  const client = await getRedisClient()
  if (client) {
    try {
      await client.del([REDIS_KEY_REGISTRATIONS])
    } catch {
      /* ignore */
    }
  }
  memoryCaches.registrations = null
}

export async function invalidateEventDetailCache(handle: string): Promise<void> {
  await redisDeleteKey(eventDetailRedisKey(handle))
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
