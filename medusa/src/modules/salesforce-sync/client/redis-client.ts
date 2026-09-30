import { createClient } from "redis"

type RedisClient = ReturnType<typeof createClient>

let redisClient: RedisClient | null = null
let redisConnect: Promise<RedisClient | null> | null = null

/** Shared Redis connection for Salesforce auth state; null when `REDIS_URL` is unset or unreachable. */
export async function getSalesforceRedis(): Promise<RedisClient | null> {
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
