/**
 * Wishlist: product handles stored on Medusa customer.metadata.va_wishlist
 */

export const WISHLIST_METADATA_KEY = 'va_wishlist' as const

function normalizeHandle(handle: string): string {
  return handle.trim()
}

/**
 * Read validated handle list from customer metadata. Ignores non-array and non-string entries.
 */
export function parseWishlistHandles(
  metadata: Record<string, unknown> | null | undefined
): string[] {
  const raw = metadata?.[WISHLIST_METADATA_KEY]
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .map((h) => normalizeHandle(h))
}

/**
 * Deduplicate while preserving first-seen order.
 */
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

/** New items first (most recent), then existing without duplicates. */
export function addHandleToList(handles: string[], handle: string): string[] {
  const h = normalizeHandle(handle)
  if (!h) return handles
  const without = handles.filter((x) => x !== h)
  return dedupeHandles([h, ...without])
}

export function removeHandleFromList(handles: string[], handle: string): string[] {
  const h = normalizeHandle(handle)
  if (!h) return handles
  return handles.filter((x) => x !== h)
}

export { normalizeHandle }
