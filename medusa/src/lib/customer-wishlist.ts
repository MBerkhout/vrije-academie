/** Customer metadata wishlist (`va_wishlist`) — mirrors storefront [frontend/src/lib/commerce/wishlist.ts]. */

export const WISHLIST_METADATA_KEY = "va_wishlist" as const
export const SF_FAVOURITES_HASH_METADATA_KEY = "sf_favourites_hash" as const

function normalizeHandle(handle: string): string {
  return handle.trim()
}

export function parseWishlistHandles(
  metadata: Record<string, unknown> | null | undefined
): string[] {
  const raw = metadata?.[WISHLIST_METADATA_KEY]
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is string => typeof x === "string" && x.trim() !== "")
    .map((h) => normalizeHandle(h))
}

function dedupeHandles(handles: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const h of handles) {
    if (seen.has(h)) continue
    seen.add(h)
    out.push(h)
  }
  return out
}

/** Local handles first, then remote additions (union, stable order). */
export function mergeWishlistHandles(local: string[], remote: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const h of [...local, ...remote]) {
    const n = normalizeHandle(h)
    if (!n || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

export function wishlistHandlesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((h, i) => h === b[i])
}

export { normalizeHandle, dedupeHandles }
