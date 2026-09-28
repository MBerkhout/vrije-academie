import { randomUUID } from "node:crypto"

import { createClient } from "redis"

const LOCK_KEY = "salesforce:oauth:refresh-lock"
const LOCK_TTL_MS = 20_000
const WAIT_MS = 20_000

type RedisClient = ReturnType<typeof createClient>

let redisClient: RedisClient | null = null
let redisConnect: Promise<RedisClient | null> | null = null

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * One Salesforce refresh at a time across PM2 workers.
 * Rotation invalidates the previous refresh token, so parallel refreshes kill the connection.
 */
export async function withSalesforceRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const redis = await getRedis()
  if (!redis) return fn()

  const owner = randomUUID()
  const deadline = Date.now() + WAIT_MS
  while (Date.now() < deadline) {
    const acquired = await redis.set(LOCK_KEY, owner, { NX: true, PX: LOCK_TTL_MS })
    if (acquired) {
      try {
        return await fn()
      } finally {
        const current = await redis.get(LOCK_KEY)
        if (current === owner) await redis.del(LOCK_KEY)
      }
    }
    await sleep(200)
  }
  throw new Error("Timed out waiting for the Salesforce refresh lock")
}
