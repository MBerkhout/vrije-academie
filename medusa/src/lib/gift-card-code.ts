/** Normalize user-entered cadeaubon / gift card codes for lookup and storage. */
export function normalizeGiftCardCode(raw: string): string {
  const t = raw.trim().toUpperCase()
  if (t.startsWith("GTC-") || t.startsWith("GIFT-")) {
    return t
  }
  return `GIFT-${t.replace(/^GIFT-?/i, "")}`
}
