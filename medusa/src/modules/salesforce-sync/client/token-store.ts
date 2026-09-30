import { getSalesforceRedis } from "./redis-client"

export type TokenCache = {
  access_token: string
  instance_url: string
  expires_at_ms: number
}

const TOKEN_KEY = "salesforce:oauth:access-token"
/** Treat a token as expired this long before its real expiry. */
export const TOKEN_EXPIRY_MARGIN_MS = 60_000

/** Minimal Redis surface used here (lets tests inject a fake). */
export type TokenStoreRedis = {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options: { PX: number }): Promise<unknown>
  del(key: string): Promise<unknown>
}

let redisOverride: TokenStoreRedis | null | undefined

/** Test hook: `undefined` restores the real Redis connection. */
export function setTokenStoreRedisForTests(redis: TokenStoreRedis | null | undefined): void {
  redisOverride = redis
}

async function redis(): Promise<TokenStoreRedis | null> {
  if (redisOverride !== undefined) return redisOverride
  return (await getSalesforceRedis()) as TokenStoreRedis | null
}

export function isTokenFresh(token: TokenCache | null, now = Date.now()): token is TokenCache {
  return !!token && token.expires_at_ms > now + TOKEN_EXPIRY_MARGIN_MS
}

/** Access token shared by all processes, so a restart does not force a refresh (and a rotation). */
export async function readSharedAccessToken(): Promise<TokenCache | null> {
  try {
    const client = await redis()
    const raw = await client?.get(TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TokenCache
    if (!parsed?.access_token || !parsed.instance_url) return null
    return isTokenFresh(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function writeSharedAccessToken(token: TokenCache): Promise<void> {
  const ttl = token.expires_at_ms - Date.now() - TOKEN_EXPIRY_MARGIN_MS
  if (ttl <= 0) return
  try {
    const client = await redis()
    await client?.set(TOKEN_KEY, JSON.stringify(token), { PX: ttl })
  } catch {
    // Best effort: each process still keeps its own in-memory copy.
  }
}

/**
 * Drop the shared token. With `onlyIfAccessToken`, only when it still holds that (rejected)
 * token, so a token another process just refreshed is not thrown away.
 */
export async function deleteSharedAccessToken(onlyIfAccessToken?: string): Promise<void> {
  try {
    const client = await redis()
    if (!client) return
    if (onlyIfAccessToken) {
      const raw = await client.get(TOKEN_KEY)
      if (!raw) return
      const current = JSON.parse(raw) as Partial<TokenCache>
      if (current.access_token !== onlyIfAccessToken) return
    }
    await client.del(TOKEN_KEY)
  } catch {
    // Ignore: a stale shared token is rejected with 401 and invalidated on the next call.
  }
}
