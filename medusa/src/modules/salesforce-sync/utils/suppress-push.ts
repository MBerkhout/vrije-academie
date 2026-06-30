/** When set during bulk CLI import, product/variant push subscribers no-op. */
export function isSalesforcePushSuppressed(): boolean {
  const value = process.env.SALESFORCE_SUPPRESS_PUSH?.trim().toLowerCase()
  return value === "1" || value === "true" || value === "yes"
}
