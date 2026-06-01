/**
 * Recently viewed product handles: localStorage + optional Medusa customer.metadata.va_recent_viewed
 */

import { addHandleToList, normalizeHandle } from './wishlist'

export const RECENT_VIEWED_METADATA_KEY = 'va_recent_viewed' as const

const STORAGE_KEY = 'va-recent-viewed'
export const MAX_RECENT_STORED = 6
export const MAX_RECENT_DISPLAY = 4

export function parseRecentViewedHandles(
  metadata: Record<string, unknown> | null | undefined
): string[] {
  const raw = metadata?.[RECENT_VIEWED_METADATA_KEY]
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .map((h) => normalizeHandle(h))
}

export function getRecentViewedHandlesLocal(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed
          .filter((v): v is string => typeof v === 'string')
          .map((h) => normalizeHandle(h))
          .slice(0, MAX_RECENT_STORED)
      : []
  } catch {
    return []
  }
}

export function setRecentViewedHandlesLocal(handles: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(handles.slice(0, MAX_RECENT_STORED))
    )
  } catch {
    /* quota / private mode */
  }
}

/** Local list first (most recent visits), then server handles not yet seen. */
export function mergeRecentViewedHandles(
  local: string[],
  remote: string[]
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const h of [...local, ...remote]) {
    const n = normalizeHandle(h)
    if (!n || seen.has(n)) continue
    seen.add(n)
    out.push(n)
    if (out.length >= MAX_RECENT_STORED) break
  }
  return out
}

export function addRecentViewedHandle(handles: string[], handle: string): string[] {
  return addHandleToList(handles, handle).slice(0, MAX_RECENT_STORED)
}

export function handlesForRecentDisplay(
  handles: string[],
  excludeHandle?: string
): string[] {
  const exclude = excludeHandle ? normalizeHandle(excludeHandle) : ''
  return handles.filter((h) => h && h !== exclude).slice(0, MAX_RECENT_DISPLAY)
}
