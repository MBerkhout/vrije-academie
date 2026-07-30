/** When set during bulk CLI import, product.updated Sanity subscriber no-ops (batch sync runs after). */
export function isSanitySyncSuppressed(): boolean {
  const value = process.env.SALESFORCE_SUPPRESS_SANITY_SYNC?.trim().toLowerCase()
  return value === "1" || value === "true" || value === "yes"
}
