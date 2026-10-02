/**
 * Invisible Unicode characters that survive `String.prototype.trim()` and end up in URLs when text is
 * pasted into Salesforce / Studio: soft hyphen, zero-width space/joiners, bidi marks, word joiner,
 * bidi embeddings/isolates and BOM (U+FEFF).
 */
const INVISIBLE_CHARS = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g

export function hasInvisibleChars(value: string): boolean {
  return new RegExp(INVISIBLE_CHARS.source).test(value)
}

/** Remove invisible characters, then trim regular whitespace. */
export function stripInvisibleChars(value: string): string {
  return value.replace(INVISIBLE_CHARS, "").trim()
}
