import { randomUUID } from "node:crypto"

import { createClient } from "redis"

const REDIS_KEY_PREFIX = "salesforce:oauth:pkce:"
const TTL_MS = 15 * 60 * 1000

type PendingState = { createdAt: number; codeVerifier: string }

type RedisClient = ReturnType<typeof createClient>

let redisClient: RedisClient | null = null
let redisConnect: Promise<RedisClient | null> | null = null

/** In-memory fallback when REDIS_URL is unset (single-process dev only). */
const memoryPending = new Map<string, PendingState>()

async function getRedis(): Promise<RedisClient | null> {
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

function pruneMemory(): void {
  const now = Date.now()
  for (const [key, row] of memoryPending) {
    if (now - row.createdAt > TTL_MS) memoryPending.delete(key)
  }
}

export async function storeOAuthPendingState(
  state: string,
  codeVerifier: string
): Promise<void> {
  const payload: PendingState = { createdAt: Date.now(), codeVerifier }
  const redis = await getRedis()
  if (redis) {
    await redis.set(`${REDIS_KEY_PREFIX}${state}`, JSON.stringify(payload), {
      PX: TTL_MS,
    })
    return
  }
  pruneMemory()
  memoryPending.set(state, payload)
}

export async function takeOAuthPendingState(
  state: string
): Promise<{ codeVerifier: string } | null> {
  const redis = await getRedis()
  if (redis) {
    const key = `${REDIS_KEY_PREFIX}${state}`
    const raw = await redis.get(key)
    if (!raw) return null
    await redis.del(key)
    try {
      const row = JSON.parse(raw) as PendingState
      if (!row?.codeVerifier) return null
      return { codeVerifier: row.codeVerifier }
    } catch {
      return null
    }
  }

  pruneMemory()
  const row = memoryPending.get(state)
  if (!row) return null
  memoryPending.delete(state)
  return { codeVerifier: row.codeVerifier }
}

/** Opaque OAuth state value (also used as Redis key suffix). */
export function newOAuthStateId(): string {
  return randomUUID().replace(/-/g, "")
}
