'use client'

import { Suspense, type ReactNode } from 'react'
import type { EventCard, EventFacets } from '@/lib/commerce/types'
import {
  hasActiveFilters,
  PAGE_SIZE,
  serializeFilterState,
  type PlpFilterState,
} from '@/app/(main)/ons-aanbod/_state/url'
import type { CategoryOption, TeacherOption } from '@/lib/cms/sanity-refs'
import { PlpSearchBar } from '@/components/plp/PlpSearchBar'
import { PlpFilterSidebar } from '@/components/plp/PlpFilterSidebar'
import { PlpActiveChips } from '@/components/plp/PlpActiveChips'
import { PlpSortSelect } from '@/components/plp/PlpSortSelect'
import {
  PlpInfiniteResultsCount,
  PlpInfiniteResultsGrid,
  PlpInfiniteResultsLoadMore,
  PlpInfiniteResultsProvider,
} from '@/components/plp/PlpInfiniteResults'
import { PlpEmptyState } from '@/components/plp/PlpEmptyState'
import { Spinner } from '@/components/ui'
import { useLiveListingSearch } from '@/components/plp/useLiveListingSearch'

type PlpLiveListingProps = {
  basePath: string
  filterState: PlpFilterState
  initialEvents: EventCard[]
  initialCount: number
  facets?: EventFacets
  categories: CategoryOption[]
  teachers: TeacherOption[]
  stockThreshold: number
  searchPlaceholder?: string
  emptyStateHeading?: string
  emptyStateSubtext?: string
  loadMoreLabel?: string
  loadError?: boolean
}

function plpSortForQuery(query: string, filterState: PlpFilterState): string {
  if (query.trim()) return 'relevance'
  return filterState.sort ?? 'start_date'
}

function mergePlpQuery(filterState: PlpFilterState, q: string | undefined): PlpFilterState {
  return { ...filterState, q }
}

export function PlpLiveListing({
  basePath,
  filterState,
  initialEvents,
  initialCount,
  facets,
  categories,
  teachers,
  stockThreshold,
  searchPlaceholder,
  emptyStateHeading,
  emptyStateSubtext,
  loadMoreLabel,
  loadError = false,
}: PlpLiveListingProps) {
  const {
    query,
    setQuery,
    items: events,
    count,
    liveFilterState,
    sort,
    searching,
    searchError,
  } = useLiveListingSearch<EventCard, PlpFilterState>({
    basePath,
    serverFilterState: filterState,
    initialItems: initialEvents,
    initialCount,
    fetchPath: '/api/plp/events',
    listKey: 'events',
    pageSize: PAGE_SIZE,
    serialize: serializeFilterState,
    getSort: plpSortForQuery,
    mergeQuery: mergePlpQuery,
  })

  const hasFilters = hasActiveFilters(liveFilterState)

  function ResultsToolbar({ showCount }: { showCount: boolean }) {
    return (
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between gap-4">
          {searching ? (
            <span className="inline-flex items-center gap-2 text-sm text-va-darkgray">
              <Spinner size="sm" />
              Zoeken…
            </span>
          ) : showCount ? (
            <PlpInfiniteResultsCount className="text-sm text-va-darkgray" />
          ) : (
            <span className="text-sm text-va-darkgray">0 activiteiten gevonden</span>
          )}
          <PlpSortSelect
            currentSort={sort}
            hasQuery={!!liveFilterState.q}
            basePath={basePath}
          />
        </div>
        {searchError ? <p className="text-sm text-red-600">{searchError}</p> : null}
        {hasFilters && (
          <PlpActiveChips
            filterState={liveFilterState}
            categories={categories}
            teachers={teachers}
            cityOptions={facets?.cities}
            basePath={basePath}
          />
        )}
      </div>
    )
  }

  let resultsBody: ReactNode

  if (loadError) {
    resultsBody = (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Kon de activiteiten niet laden. Probeer het opnieuw.
      </div>
    )
  } else if (events.length === 0 && !searching) {
    resultsBody = (
      <>
        <ResultsToolbar showCount={false} />
        <div className="lg:hidden mb-4">
          <PlpFilterSidebar
            filterState={liveFilterState}
            categories={categories}
            teachers={teachers}
            facets={facets}
            mobileOnly
            basePath={basePath}
          />
        </div>
        <PlpEmptyState
          heading={emptyStateHeading ?? 'Geen activiteiten gevonden.'}
          subtext={
            emptyStateSubtext ?? 'Probeer een andere zoekopdracht of pas je filters aan.'
          }
          hasFilters={hasFilters}
        />
      </>
    )
  } else {
    resultsBody = (
      <PlpInfiniteResultsProvider
        initialEvents={events}
        totalCount={count}
        filterState={liveFilterState}
        sort={sort}
        pageSize={PAGE_SIZE}
      >
        <ResultsToolbar showCount />
        <div className="lg:hidden mb-4">
          <PlpFilterSidebar
            filterState={liveFilterState}
            categories={categories}
            teachers={teachers}
            facets={facets}
            mobileOnly
            basePath={basePath}
          />
        </div>
        <div className={searching ? 'opacity-60 pointer-events-none transition-opacity' : undefined}>
          <Suspense>
            <PlpInfiniteResultsGrid stockThreshold={stockThreshold} />
          </Suspense>
        </div>
        <PlpInfiniteResultsLoadMore loadMoreLabel={loadMoreLabel} />
      </PlpInfiniteResultsProvider>
    )
  }

  return (
    <>
      <div className="mt-6">
        <PlpSearchBar
          value={query}
          onChange={setQuery}
          placeholder={searchPlaceholder}
          basePath={basePath}
          live
        />
      </div>

      <div className="mt-8">
        <div className="flex gap-8 items-start">
          <aside className="hidden lg:block w-72 shrink-0">
            <PlpFilterSidebar
              filterState={liveFilterState}
              categories={categories}
              teachers={teachers}
              facets={facets}
              basePath={basePath}
            />
          </aside>
          <div className="flex-1 min-w-0">{resultsBody}</div>
        </div>
      </div>
    </>
  )
}
