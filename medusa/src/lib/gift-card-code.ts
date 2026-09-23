/** Legacy Medusa-issued codes: GIFT- + 8 hex chars, or 8 hex alone. */
const LEGACY_MEDUSA_HEX = /^[0-9A-F]{8}$/i

/** Normalize user-entered cadeaubon / gift card codes for lookup and storage. */
export function normalizeGiftCardCode(raw: string): string {
  const t = raw.trim().toUpperCase()
  if (t.startsWith("GTC-") || t.startsWith("GIFT-")) {
    return t
  }
  if (LEGACY_MEDUSA_HEX.test(t)) {
    return `GIFT-${t}`
  }
  // Salesforce redeem codes (e.g. LNL6NKD) — keep as entered
  return t
}
