/** When set during bulk CLI import, product.updated Sanity subscriber no-ops (batch sync runs after). */
export function isSanitySyncSuppressed(): boolean {
  const value = process.env.SALESFORCE_SUPPRESS_SANITY_SYNC?.trim().toLowerCase()
  return value === "1" || value === "true" || value === "yes"
}

/** Temporarily suppress per-event Sanity writes (webhook queue batch sync at end). */
export async function withSanitySyncSuppressed<T>(fn: () => Promise<T>): Promise<T> {
  const prev = process.env.SALESFORCE_SUPPRESS_SANITY_SYNC
  process.env.SALESFORCE_SUPPRESS_SANITY_SYNC = "1"
  try {
    return await fn()
  } finally {
    if (prev === undefined) delete process.env.SALESFORCE_SUPPRESS_SANITY_SYNC
    else process.env.SALESFORCE_SUPPRESS_SANITY_SYNC = prev
  }
}
