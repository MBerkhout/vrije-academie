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
import type { EventCard } from '@/lib/commerce/types'
import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import { serializeFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import { PlpResultsGrid } from '@/components/plp/PlpResultsGrid'
import { Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'

type PlpInfiniteResultsContextValue = {
  shownEnd: number
  totalCount: number
  events: EventCard[]
  hasMore: boolean
  loading: boolean
  error: string | null
  loadMore: () => void
}

const PlpInfiniteResultsContext = createContext<PlpInfiniteResultsContextValue | null>(null)

function usePlpInfiniteResults() {
  const ctx = useContext(PlpInfiniteResultsContext)
  if (!ctx) {
    throw new Error('PlpInfiniteResults components must be used within PlpInfiniteResultsProvider')
  }
  return ctx
}

type PlpInfiniteResultsProviderProps = {
  initialEvents: EventCard[]
  totalCount: number
  filterState: PlpFilterState
  sort: string
  pageSize: number
  children: ReactNode
}

export function PlpInfiniteResultsProvider({
  initialEvents,
  totalCount,
  filterState,
  sort,
  pageSize,
  children,
}: PlpInfiniteResultsProviderProps) {
  const [events, setEvents] = useState(initialEvents)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filterKey = useMemo(
    () => JSON.stringify({ filterState, sort }),
    [filterState, sort]
  )

  useEffect(() => {
    setEvents(initialEvents)
    setError(null)
  }, [initialEvents, filterKey])

  const hasMore = events.length < totalCount

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    setError(null)

    try {
      const params = serializeFilterState({ ...filterState, sort: sort as PlpFilterState['sort'] })
      params.set('offset', String(events.length))
      params.set('limit', String(pageSize))

      const response = await fetch(`/api/plp/events?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load')

      const data = (await response.json()) as { events?: EventCard[] }
      const next = data.events ?? []
      if (next.length > 0) {
        setEvents((prev) => [...prev, ...next])
      }
    } catch {
      setError('Kon extra activiteiten niet laden. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, filterState, sort, events.length, pageSize])

  const value: PlpInfiniteResultsContextValue = {
    shownEnd: Math.min(events.length, totalCount),
    totalCount,
    events,
    hasMore,
    loading,
    error,
    loadMore: () => void loadMore(),
  }

  return (
    <PlpInfiniteResultsContext.Provider value={value}>
      {children}
    </PlpInfiniteResultsContext.Provider>
  )
}

export function PlpInfiniteResultsCount({ className }: { className?: string }) {
  const { shownEnd, totalCount } = usePlpInfiniteResults()

  return (
    <span className={className}>
      {totalCount > 0
        ? `1–${shownEnd} van ${totalCount} activiteiten`
        : '0 activiteiten gevonden'}
    </span>
  )
}

export function PlpInfiniteResultsGrid({ stockThreshold }: { stockThreshold: number }) {
  const { events } = usePlpInfiniteResults()
  return (
    <PlpResultsGrid
      events={events}
      stockThreshold={stockThreshold}
    />
  )
}

export function PlpInfiniteResultsLoadMore({
  loadMoreLabel = 'Laad meer activiteiten',
  className,
}: {
  loadMoreLabel?: string
  className?: string
}) {
  const { hasMore, loading, error, loadMore, shownEnd, totalCount, events } =
    usePlpInfiniteResults()
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
  }, [hasMore, loading, loadMore, events.length])

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
