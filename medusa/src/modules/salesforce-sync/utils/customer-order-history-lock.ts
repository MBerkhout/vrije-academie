import { randomUUID } from "node:crypto"

import { getSalesforceRedis } from "../client/redis-client"

const LOCK_PREFIX = "salesforce:order-history:customer:"
const LOCK_TTL_MS = 30 * 60 * 1000

export async function withCustomerOrderHistoryLock<T>(
  customerId: string,
  fn: () => Promise<T>
): Promise<T | null> {
  const redis = await getSalesforceRedis()
  if (!redis) return fn()

  const key = `${LOCK_PREFIX}${customerId}`
  const owner = randomUUID()
  const acquired = await redis.set(key, owner, { NX: true, PX: LOCK_TTL_MS })
  if (!acquired) return null

  try {
    return await fn()
  } finally {
    const current = await redis.get(key)
    if (current === owner) await redis.del(key)
  }
}
