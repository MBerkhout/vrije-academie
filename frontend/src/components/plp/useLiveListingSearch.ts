'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { trackSearch } from '@/lib/analytics/events/engagement'

/** Stable key for filter props excluding live search query (avoids resetting input on `q` URL sync). */
export function listingFiltersKeyWithoutQuery<T extends { q?: string }>(state: T): string {
  const { q: _q, ...rest } = state
  return JSON.stringify(rest)
}

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
  const serverFiltersKey = useMemo(
    () => listingFiltersKeyWithoutQuery(serverFilterState),
    [serverFilterState]
  )
  const fetchGenerationRef = useRef(0)
  const queryEditingRef = useRef(false)
  const queryRef = useRef(query)
  queryRef.current = query

  const updateQuery = useCallback((value: string) => {
    queryEditingRef.current = true
    setQuery(value)
  }, [])

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
    queryEditingRef.current = false
    setQuery(serverFilterState.q ?? '')
    setItems(initialItems)
    setCount(initialCount)
    setSearchError(null)
    // Only when non-query filters / path change — not on server `q` sync after live search.
  }, [serverFiltersKey, basePath])

  useEffect(() => {
    if (queryEditingRef.current) return
    setQuery(serverFilterState.q ?? '')
  }, [serverFilterState.q])

  const liveFilterState = useMemo(
    () => mergeQuery(serverFilterState, query.trim() || undefined),
    [serverFilterState, query, mergeQuery]
  )

  const sort = getSort(query.trim(), serverFilterState)

  useEffect(() => {
    const trimmed = query.trim()
    const serverQ = (serverFilterState.q ?? '').trim()
    if (trimmed === serverQ) {
      queryEditingRef.current = false
      return
    }

    const timer = window.setTimeout(async () => {
      const generation = ++fetchGenerationRef.current
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
        if (generation !== fetchGenerationRef.current) return

        const nextItems = (data[listKey] as TItem[]) ?? []
        const nextCount = typeof data.count === 'number' ? data.count : 0
        setItems(nextItems)
        setCount(nextCount)
        if (queryRef.current.trim() === trimmed) {
          queryEditingRef.current = false
        }
        if (trimmed) {
          trackSearch(trimmed, nextCount)
        }
      } catch {
        if (generation !== fetchGenerationRef.current) return
        setSearchError('Kon zoekresultaten niet laden. Probeer het opnieuw.')
      } finally {
        if (generation === fetchGenerationRef.current) {
          setSearching(false)
        }
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
    setQuery: updateQuery,
    items,
    count,
    liveFilterState,
    sort,
    searching,
    searchError,
  }
}
