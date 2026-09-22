export const LISTING_PRODUCT_ANCHOR_PREFIX = 'product'
export const LISTING_AGENDA_ANCHOR_PREFIX = 'agenda'

const STORAGE_KEY = 'va-listing-return-anchor'
const HISTORY_STATE_KEY = 'vaListingAnchor'
const MAX_AGE_MS = 30 * 60 * 1000

type SavedListingAnchor = {
  pathname: string
  search: string
  anchorId: string
  scrollY: number
  savedAt: number
}

export type ListingReturnScrollState = 'none' | 'waiting' | 'ready'

export function listingProductAnchorId(handle: string): string {
  return `${LISTING_PRODUCT_ANCHOR_PREFIX}-${handle}`
}

export function listingAgendaAnchorId(itemId: string, variantId: string): string {
  return `${LISTING_AGENDA_ANCHOR_PREFIX}-${itemId}-${variantId}`
}

export function parseListingAnchorId(hashOrId: string | null | undefined): string | null {
  if (!hashOrId) return null
  const id = hashOrId.startsWith('#') ? hashOrId.slice(1) : hashOrId
  if (!id) return null
  if (
    id.startsWith(`${LISTING_PRODUCT_ANCHOR_PREFIX}-`) ||
    id.startsWith(`${LISTING_AGENDA_ANCHOR_PREFIX}-`)
  ) {
    return id
  }
  return null
}

function mergeHistoryState(anchorId: string): object {
  const prev =
    typeof window !== 'undefined' && window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : {}
  return { ...prev, [HISTORY_STATE_KEY]: anchorId }
}

function disableBrowserScrollRestoration(): void {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual'
  }
}

export function markListingReturnAnchor(anchorId: string): void {
  if (typeof window === 'undefined' || !anchorId) return

  disableBrowserScrollRestoration()

  const { pathname, search } = window.location
  const nextUrl = `${pathname}${search}#${anchorId}`
  window.history.replaceState(mergeHistoryState(anchorId), '', nextUrl)

  const payload: SavedListingAnchor = {
    pathname,
    search,
    anchorId,
    scrollY: Math.round(window.scrollY),
    savedAt: Date.now(),
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore quota / private-mode failures; hash + history.state still work.
  }
}

function readSavedListingAnchor(): SavedListingAnchor | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as SavedListingAnchor
    if (!saved?.anchorId || !saved.pathname) return null
    if (typeof saved.savedAt === 'number' && Date.now() - saved.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return saved
  } catch {
    return null
  }
}

function savedAnchorMatchesLocation(saved: SavedListingAnchor): boolean {
  return saved.pathname === window.location.pathname && (saved.search ?? '') === window.location.search
}

export function peekListingReturnAnchor(): string | null {
  if (typeof window === 'undefined') return null

  const fromHash = parseListingAnchorId(window.location.hash)
  if (fromHash) return fromHash

  const state = window.history.state
  if (state && typeof state === 'object') {
    const fromState = parseListingAnchorId((state as Record<string, unknown>)[HISTORY_STATE_KEY] as string)
    if (fromState) return fromState
  }

  const saved = readSavedListingAnchor()
  if (!saved || !savedAnchorMatchesLocation(saved)) return null
  return parseListingAnchorId(saved.anchorId)
}

export function peekListingReturnScrollY(): number | null {
  if (typeof window === 'undefined') return null
  const saved = readSavedListingAnchor()
  if (!saved || !savedAnchorMatchesLocation(saved)) return null
  return typeof saved.scrollY === 'number' ? saved.scrollY : null
}

function listingAnchorInView(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.top < window.innerHeight && rect.bottom > 0
}

/** Apply the saved listing offset (and the card if needed) without waiting for paint. */
export function restoreListingReturnScrollPosition(): ListingReturnScrollState {
  if (typeof window === 'undefined') return 'none'

  const anchorId = peekListingReturnAnchor()
  if (!anchorId) return 'none'

  disableBrowserScrollRestoration()

  const savedY = peekListingReturnScrollY()
  if (savedY != null) {
    window.scrollTo(0, savedY)
  }

  const el = document.getElementById(anchorId)
  if (!el) return 'waiting'

  if (savedY == null || !listingAnchorInView(el)) {
    el.scrollIntoView({ block: savedY == null ? 'center' : 'nearest' })
  }

  return 'ready'
}

/** While a listing return is pending, rewrite scroll-to-top into the saved offset. */
export function installListingReturnScrollGuard(): () => void {
  const original = window.scrollTo.bind(window)
  const guarded = ((x?: ScrollToOptions | number, y?: number) => {
    const savedY = peekListingReturnScrollY()
    if (savedY != null && savedY > 0 && peekListingReturnAnchor()) {
      const top = typeof x === 'number' ? x : x?.top
      if (top === 0) {
        original(0, savedY)
        return
      }
    }
    if (typeof x === 'number') original(x, y ?? 0)
    else original(x as ScrollToOptions)
  }) as typeof window.scrollTo
  window.scrollTo = guarded
  return () => {
    window.scrollTo = original
  }
}

export function keepLoadedListingItems<T extends { id: string }>(
  prev: T[],
  incoming: T[],
): T[] {
  if (
    incoming.length > 0 &&
    prev.length >= incoming.length &&
    incoming.every((item, i) => item.id === prev[i]?.id)
  ) {
    return prev
  }
  return incoming
}

const loadedListingCache = new Map<string, { id: string }[]>()

export function readCachedListingItems<T extends { id: string }>(
  cacheKey: string,
  incoming: T[],
): T[] {
  const prev = loadedListingCache.get(cacheKey) as T[] | undefined
  if (!prev?.length) return incoming
  return keepLoadedListingItems(prev, incoming)
}

export function writeCachedListingItems<T extends { id: string }>(
  cacheKey: string,
  items: T[],
): void {
  loadedListingCache.set(cacheKey, items)
}

export function appendUniqueListingItems<T extends { id: string }>(
  prev: T[],
  incoming: T[],
): T[] {
  if (incoming.length === 0) return prev
  const seen = new Set(prev.map((item) => item.id))
  const unique = incoming.filter((item) => !seen.has(item.id))
  return unique.length > 0 ? [...prev, ...unique] : prev
}

export function clearCachedListingItems(cacheKey?: string): void {
  if (cacheKey) loadedListingCache.delete(cacheKey)
  else loadedListingCache.clear()
}

export function clearListingReturnAnchor(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }

  const hashId = parseListingAnchorId(window.location.hash)
  const state = window.history.state
  const stateId =
    state && typeof state === 'object'
      ? parseListingAnchorId((state as Record<string, unknown>)[HISTORY_STATE_KEY] as string)
      : null
  if (!hashId && !stateId) return

  const nextState =
    state && typeof state === 'object' ? { ...(state as Record<string, unknown>) } : {}
  delete nextState[HISTORY_STATE_KEY]
  const { pathname, search } = window.location
  window.history.replaceState(nextState, '', `${pathname}${search}`)
}
