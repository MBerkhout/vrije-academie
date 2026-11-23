'use client'

import { safeLocalStorage } from '@/lib/safe-storage'
const STORAGE_KEY = 'va-recent-searches'
const MAX_RECENT = 6

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT)
      : []
  } catch {
    return []
  }
}

export function addRecentSearch(query: string): void {
  const q = query.trim()
  if (!q || typeof window === 'undefined') return
  const prev = getRecentSearches().filter((item) => item.toLowerCase() !== q.toLowerCase())
  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)))
}
