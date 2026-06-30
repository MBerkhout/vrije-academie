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
import type { VathuisFilterState } from '@/app/(main)/va-thuis/_state/url'
import { serializeVathuisFilterState, VATHUIS_PAGE_SIZE } from '@/app/(main)/va-thuis/_state/url'
import { VaThuisResultsGrid } from '@/components/vathuis/VaThuisResultsGrid'
import { Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'

type VaThuisInfiniteContextValue = {
  shownEnd: number
  totalCount: number
  events: EventCard[]
  hasMore: boolean
  loading: boolean
  error: string | null
  loadMore: () => void
}

const VaThuisInfiniteContext = createContext<VaThuisInfiniteContextValue | null>(null)

function useVaThuisInfinite() {
  const ctx = useContext(VaThuisInfiniteContext)
  if (!ctx) {
    throw new Error('VaThuis infinite components must be used within VaThuisInfiniteResultsProvider')
  }
  return ctx
}

type VaThuisInfiniteResultsProviderProps = {
  initialEvents: EventCard[]
  totalCount: number
  filterState: VathuisFilterState
  sort: string
  pageSize: number
  children: ReactNode
}

export function VaThuisInfiniteResultsProvider({
  initialEvents,
  totalCount,
  filterState,
  sort,
  pageSize,
  children,
}: VaThuisInfiniteResultsProviderProps) {
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
      const params = serializeVathuisFilterState({
        ...filterState,
        sort: sort as VathuisFilterState['sort'],
      })
      params.set('offset', String(events.length))
      params.set('limit', String(pageSize))

      const response = await fetch(`/api/plp/vathuis?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load')

      const data = (await response.json()) as { items?: EventCard[] }
      const next = data.items ?? []
      if (next.length > 0) {
        setEvents((prev) => [...prev, ...next])
      }
    } catch {
      setError('Kon extra colleges niet laden. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, filterState, sort, events.length, pageSize])

  const value: VaThuisInfiniteContextValue = {
    shownEnd: Math.min(events.length, totalCount),
    totalCount,
    events,
    hasMore,
    loading,
    error,
    loadMore: () => void loadMore(),
  }

  return (
    <VaThuisInfiniteContext.Provider value={value}>
      {children}
    </VaThuisInfiniteContext.Provider>
  )
}

export function VaThuisInfiniteResultsCount({ className }: { className?: string }) {
  const { shownEnd, totalCount } = useVaThuisInfinite()

  return (
    <span className={className}>
      {totalCount > 0
        ? `1–${shownEnd} van ${totalCount} colleges`
        : '0 colleges gevonden'}
    </span>
  )
}

export function VaThuisInfiniteResultsGrid({ stockThreshold }: { stockThreshold: number }) {
  const { events } = useVaThuisInfinite()
  return <VaThuisResultsGrid events={events} stockThreshold={stockThreshold} />
}

export function VaThuisInfiniteResultsLoadMore({
  loadMoreLabel = 'Laad meer colleges',
  className,
}: {
  loadMoreLabel?: string
  className?: string
}) {
  const { hasMore, loading, error, loadMore, shownEnd, totalCount, events } =
    useVaThuisInfinite()
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
      <p className="text-sm text-va-gray-400">
        Resultaat 1–{shownEnd} van {totalCount}
      </p>
      {error && <p className="text-sm text-red-400">{error}</p>}
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
