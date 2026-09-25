import { createHash } from "crypto"

/** Stable signed bigint for pg_advisory_lock. Same cart id always maps to the same key. */
export function giftCardCartLockKey(cartId: string): string {
  const buf = createHash("sha256").update(`gift-card:${cartId}`).digest()
  return buf.readBigInt64BE(0).toString()
}
