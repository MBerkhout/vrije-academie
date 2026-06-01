'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AgendaItem } from '@/lib/commerce/types'
import type { AgendaFilterState } from '@/app/(main)/agenda/_state/url'
import { serializeFilterState } from '@/app/(main)/agenda/_state/url'
import { AgendaResultsList } from '@/components/agenda/AgendaResultsList'
import { Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'

type AgendaInfiniteResultsContextValue = {
  shownEnd: number
  totalCount: number
  items: AgendaItem[]
  hasMore: boolean
  loading: boolean
  error: string | null
  loadMore: () => void
}

const AgendaInfiniteResultsContext = createContext<AgendaInfiniteResultsContextValue | null>(null)

function useAgendaInfiniteResults() {
  const ctx = useContext(AgendaInfiniteResultsContext)
  if (!ctx) {
    throw new Error('AgendaInfiniteResults components must be used within AgendaInfiniteResultsProvider')
  }
  return ctx
}

type AgendaInfiniteResultsProviderProps = {
  initialItems: AgendaItem[]
  totalCount: number
  filterState: AgendaFilterState
  sort: string
  pageSize: number
  children: ReactNode
}

export function AgendaInfiniteResultsProvider({
  initialItems,
  totalCount,
  filterState,
  sort,
  pageSize,
  children,
}: AgendaInfiniteResultsProviderProps) {
  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filterKey = useMemo(
    () => JSON.stringify({ filterState, sort }),
    [filterState, sort]
  )

  useEffect(() => {
    setItems(initialItems)
    setError(null)
  }, [initialItems, filterKey])

  const hasMore = items.length < totalCount

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    setError(null)

    try {
      const params = serializeFilterState({
        ...filterState,
        sort: sort as AgendaFilterState['sort'],
      })
      params.set('offset', String(items.length))
      params.set('limit', String(pageSize))

      const response = await fetch(`/api/agenda/items?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load')

      const data = (await response.json()) as { items?: AgendaItem[] }
      const next = data.items ?? []
      if (next.length > 0) {
        setItems((prev) => [...prev, ...next])
      }
    } catch {
      setError('Kon extra activiteiten niet laden. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, filterState, sort, items.length, pageSize])

  const value: AgendaInfiniteResultsContextValue = {
    shownEnd: Math.min(items.length, totalCount),
    totalCount,
    items,
    hasMore,
    loading,
    error,
    loadMore: () => void loadMore(),
  }

  return (
    <AgendaInfiniteResultsContext.Provider value={value}>
      {children}
    </AgendaInfiniteResultsContext.Provider>
  )
}

export function AgendaInfiniteResultsCount({ className }: { className?: string }) {
  const { shownEnd, totalCount } = useAgendaInfiniteResults()

  return (
    <span className={className}>
      {totalCount > 0
        ? `1–${shownEnd} van ${totalCount} activiteiten`
        : '0 activiteiten gevonden'}
    </span>
  )
}

export function AgendaInfiniteResultsList() {
  const { items } = useAgendaInfiniteResults()
  return <AgendaResultsList items={items} />
}

export function AgendaInfiniteResultsLoadMore({
  loadMoreLabel = 'Laad meer activiteiten',
  className,
}: {
  loadMoreLabel?: string
  className?: string
}) {
  const { hasMore, loading, error, loadMore, shownEnd, totalCount, items } =
    useAgendaInfiniteResults()
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore()
        }
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadMore, items.length])

  if (!hasMore) return null

  return (
    <div className={cn('mt-10 flex flex-col items-center gap-3', className)}>
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
      <p className="text-sm text-va-gray">
        Resultaat 1–{shownEnd} van {totalCount}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={loadMore}
        disabled={loading}
        className="inline-flex items-center gap-2 bg-va-yellow text-va-black px-6 py-3 font-medium hover:bg-va-yellow/80 transition-colors disabled:opacity-60"
      >
        {loading ? (
          <>
            <Spinner size="sm" className="text-va-black" />
            Laden…
          </>
        ) : (
          loadMoreLabel
        )}
      </button>
    </div>
  )
}
