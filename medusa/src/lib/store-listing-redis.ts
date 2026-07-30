import { createClient } from "redis"

export const REDIS_KEY_PLP = "store:listing:plp"
export const REDIS_KEY_AGENDA = "store:listing:agenda"
export const REDIS_KEY_VATHUIS = "store:listing:vathuis"
export const REDIS_KEY_REGISTRATIONS = "store:listing:registrations"

/** PLP/agenda snapshot TTL — keep high enough to avoid ~3–4s cold rebuilds under traffic. */
export const LISTING_CACHE_TTL_SEC = 300

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

/** Drop all storefront listing caches (PLP, agenda, registration counts). */
export async function invalidateStoreListingCache(): Promise<void> {
  const client = await getRedisClient()
  if (client) {
    try {
      await client.del([
        REDIS_KEY_PLP,
        REDIS_KEY_AGENDA,
        REDIS_KEY_VATHUIS,
        REDIS_KEY_REGISTRATIONS,
      ])
    } catch {
      /* ignore */
    }
  }
  invalidateMemoryListingCaches()
}

/** In-process fallback when Redis is unavailable (also cleared on invalidation). */
const memoryCaches = {
  plp: null as { value: unknown; expiresAt: number } | null,
  agenda: null as { value: unknown; expiresAt: number } | null,
  vathuis: null as { value: unknown; expiresAt: number } | null,
  registrations: null as { value: unknown; expiresAt: number } | null,
}

export function memoryGet<T>(slot: keyof typeof memoryCaches): T | null {
  const entry = memoryCaches[slot]
  if (entry && Date.now() < entry.expiresAt) return entry.value as T
  return null
}

export function memorySet(slot: keyof typeof memoryCaches, value: unknown): void {
  memoryCaches[slot] = {
    value,
    expiresAt: Date.now() + LISTING_CACHE_TTL_SEC * 1000,
  }
}

export function invalidateMemoryListingCaches(): void {
  memoryCaches.plp = null
  memoryCaches.agenda = null
  memoryCaches.vathuis = null
  memoryCaches.registrations = null
}
