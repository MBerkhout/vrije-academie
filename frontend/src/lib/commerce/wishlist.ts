/**
 * Wishlist: product handles in localStorage (`va-wishlist`) and, when logged in,
 * Medusa customer.metadata.va_wishlist (merged on login).
 */

export const WISHLIST_METADATA_KEY = 'va_wishlist' as const

const STORAGE_KEY = 'va-wishlist'

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

export function getWishlistHandlesLocal(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed
          .filter((v): v is string => typeof v === 'string')
          .map((h) => normalizeHandle(h))
          .filter(Boolean)
      : []
  } catch {
    return []
  }
}

export function setWishlistHandlesLocal(handles: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dedupeHandles(handles)))
  } catch {
    /* quota / private mode */
  }
}

/** Local handles first, then account handles not yet saved locally. */
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

export { normalizeHandle }
