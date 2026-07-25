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
    setQuery(serverFilterState.q ?? '')
    setItems(initialItems)
    setCount(initialCount)
    setSearchError(null)
  }, [serverKey, initialItems, initialCount, serverFilterState.q])

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
      window.history.replaceState(null, '', nextUrl)

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
