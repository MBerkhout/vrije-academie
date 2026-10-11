'use client'

import { useEffect, useMemo, useState } from 'react'
import { trackSearch } from '@/lib/analytics/events/engagement'

type UseLiveListingSearchOptions<TItem, TFilter extends { q?: string; sort?: string }> = {
  basePath: string
  serverFilterState: TFilter
  initialItems: TItem[]
  initialCount: number
  fetchPath: string
  listKey: 'events' | 'items'
  pageSize: number
  serialize: (state: TFilter) => URLSearchParams
  getSort: (query: string, filterState: TFilter) => string
  mergeQuery: (filterState: TFilter, query: string | undefined) => TFilter
}

export function useLiveListingSearch<TItem, TFilter extends { q?: string; sort?: string }>({
  basePath,
  serverFilterState,
  initialItems,
  initialCount,
  fetchPath,
  listKey,
  pageSize,
  serialize,
  getSort,
  mergeQuery,
}: UseLiveListingSearchOptions<TItem, TFilter>) {
  const [query, setQuery] = useState(serverFilterState.q ?? '')
  const [items, setItems] = useState(initialItems)
  const [count, setCount] = useState(initialCount)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const serverKey = useMemo(() => JSON.stringify(serverFilterState), [serverFilterState])

  useEffect(() => {
    // #region agent log
    try {
      const clickTs = sessionStorage.getItem('debugFilterClickTs_1cde71')
      if (clickTs) {
        const navigationMs = Date.now() - Number(clickTs)
        fetch('http://127.0.0.1:7766/ingest/daa88646-6778-4a68-b046-b8741af3d131', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1cde71' },
          body: JSON.stringify({
            sessionId: '1cde71',
            location: 'useLiveListingSearch.ts:serverKey',
            message: 'listing props updated after filter nav',
            hypothesisId: 'A',
            data: {
              basePath,
              navigationMs,
              initialCount,
              initialItemsLen: initialItems.length,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
        sessionStorage.removeItem('debugFilterClickTs_1cde71')
      }
    } catch {
      /* ignore */
    }
    // #endregion
    setQuery(serverFilterState.q ?? '')
    setItems(initialItems)
    setCount(initialCount)
    setSearchError(null)
  }, [serverKey, initialItems, initialCount, serverFilterState.q, basePath])

  const liveFilterState = useMemo(
    () => mergeQuery(serverFilterState, query.trim() || undefined),
    [serverFilterState, query, mergeQuery]
  )

  const sort = getSort(query.trim(), serverFilterState)

  useEffect(() => {
    const trimmed = query.trim()
    const serverQ = (serverFilterState.q ?? '').trim()
    if (trimmed === serverQ) return

    const timer = window.setTimeout(async () => {
      const nextSort = getSort(trimmed, serverFilterState)
      const params = serialize(
        mergeQuery(serverFilterState, trimmed || undefined)
      )
      if (nextSort) params.set('sort', nextSort)
      params.set('limit', String(pageSize))
      params.set('offset', '0')

      const nextUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath
      window.history.replaceState(window.history.state, '', nextUrl)

      setSearching(true)
      setSearchError(null)

      try {
        const response = await fetch(`${fetchPath}?${params.toString()}`)
        if (!response.ok) throw new Error('fetch failed')

        const data = (await response.json()) as Record<string, unknown>
        const nextItems = (data[listKey] as TItem[]) ?? []
        const nextCount = typeof data.count === 'number' ? data.count : 0
        setItems(nextItems)
        setCount(nextCount)
        if (trimmed) {
          trackSearch(trimmed, nextCount)
        }
      } catch {
        setSearchError('Kon zoekresultaten niet laden. Probeer het opnieuw.')
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [
    query,
    serverKey,
    basePath,
    fetchPath,
    listKey,
    pageSize,
    serialize,
    getSort,
    mergeQuery,
    serverFilterState,
  ])

  return {
    query,
    setQuery,
    items,
    count,
    liveFilterState,
    sort,
    searching,
    searchError,
  }
}
