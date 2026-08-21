'use client'

import { Suspense, type ReactNode } from 'react'
import type { AgendaItem, EventFacets } from '@/lib/commerce/types'
import {
  hasActiveFilters,
  PAGE_SIZE,
  serializeFilterState,
  type AgendaFilterState,
} from '@/app/(main)/agenda/_state/url'
import type { CategoryOption, TeacherOption } from '@/lib/cms/sanity-refs'
import { formatDateFromYmd } from '@/lib/locale-format'
import { PlpSearchBar } from '@/components/plp/PlpSearchBar'
import { PlpActiveChips } from '@/components/plp/PlpActiveChips'
import { PlpSortSelect } from '@/components/plp/PlpSortSelect'
import { PlpEmptyState } from '@/components/plp/PlpEmptyState'
import { Spinner } from '@/components/ui'
import { useLiveListingSearch } from '@/components/plp/useLiveListingSearch'
import { AgendaFilterSidebar } from '@/components/agenda/AgendaFilterSidebar'
import {
  AgendaInfiniteResultsCount,
  AgendaInfiniteResultsList,
  AgendaInfiniteResultsLoadMore,
  AgendaInfiniteResultsProvider,
} from '@/components/agenda/AgendaInfiniteResults'
import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'

const AGENDA_SORT_OPTIONS = [
  { value: 'start_date', label: 'Eerstvolgende eerst' },
  { value: 'start_date_desc', label: 'Laatste eerst' },
  { value: 'price_asc', label: 'Prijs: laag–hoog' },
  { value: 'price_desc', label: 'Prijs: hoog–laag' },
]

type AgendaLiveListingProps = {
  filterState: AgendaFilterState
  initialItems: AgendaItem[]
  initialCount: number
  facets?: EventFacets
  categories: CategoryOption[]
  teachers: TeacherOption[]
  searchPlaceholder?: string
  searchSubmitLabel?: string
  emptyStateHeading?: string
  emptyStateSubtext?: string
  loadMoreLabel?: string
  loadError?: boolean
}

function agendaSortForQuery(query: string, filterState: AgendaFilterState): string {
  if (query.trim()) return 'relevance'
  return filterState.sort ?? 'start_date'
}

function mergeAgendaQuery(
  filterState: AgendaFilterState,
  q: string | undefined
): AgendaFilterState {
  return { ...filterState, q }
}

export function AgendaLiveListing({
  filterState,
  initialItems,
  initialCount,
  facets,
  categories,
  teachers,
  searchPlaceholder,
  searchSubmitLabel,
  emptyStateHeading,
  emptyStateSubtext,
  loadMoreLabel,
  loadError = false,
}: AgendaLiveListingProps) {
  const {
    query,
    setQuery,
    items,
    count,
    liveFilterState,
    sort,
    searching,
    searchError,
  } = useLiveListingSearch<AgendaItem, AgendaFilterState>({
    basePath: '/agenda',
    serverFilterState: filterState,
    initialItems,
    initialCount,
    fetchPath: '/api/agenda/items',
    listKey: 'items',
    pageSize: PAGE_SIZE,
    serialize: serializeFilterState,
    getSort: agendaSortForQuery,
    mergeQuery: mergeAgendaQuery,
  })

  const extraChips = liveFilterState.date
    ? [{ key: 'date', label: formatDateFromYmd(liveFilterState.date) }]
    : []

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
            <AgendaInfiniteResultsCount className="text-sm text-va-darkgray" />
          ) : (
            <span className="text-sm text-va-darkgray">0 activiteiten gevonden</span>
          )}
          <PlpSortSelect
            currentSort={sort}
            hasQuery={!!liveFilterState.q}
            basePath="/agenda"
            options={AGENDA_SORT_OPTIONS}
          />
        </div>
        {searchError ? <p className="text-sm text-red-600">{searchError}</p> : null}
        {hasFilters && (
          <PlpActiveChips
            filterState={liveFilterState as unknown as PlpFilterState}
            categories={categories}
            teachers={teachers}
            cityOptions={facets?.cities}
            basePath="/agenda"
            extraChips={extraChips}
          />
        )}
      </div>
    )
  }

  let resultsBody: ReactNode

  if (loadError) {
    resultsBody = (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Kon de agenda niet laden. Probeer het opnieuw.
      </div>
    )
  } else if (items.length === 0 && !searching) {
    resultsBody = (
      <>
        <ResultsToolbar showCount={false} />
        <div className="lg:hidden mb-4">
          <AgendaFilterSidebar
            filterState={liveFilterState}
            categories={categories}
            teachers={teachers}
            facets={facets}
            mobileOnly
          />
        </div>
        <PlpEmptyState
          heading={emptyStateHeading ?? 'Geen activiteiten gevonden.'}
          subtext={
            emptyStateSubtext ?? 'Probeer een andere zoekopdracht of pas je filters aan.'
          }
          hasFilters={hasFilters}
          basePath="/agenda"
        />
      </>
    )
  } else {
    resultsBody = (
      <AgendaInfiniteResultsProvider
        initialItems={items}
        totalCount={count}
        filterState={liveFilterState}
        sort={sort}
        pageSize={PAGE_SIZE}
      >
        <ResultsToolbar showCount />
        <div className="lg:hidden mb-4">
          <AgendaFilterSidebar
            filterState={liveFilterState}
            categories={categories}
            teachers={teachers}
            facets={facets}
            mobileOnly
          />
        </div>
        <div className={searching ? 'opacity-60 pointer-events-none transition-opacity' : undefined}>
          <Suspense>
            <AgendaInfiniteResultsList />
          </Suspense>
        </div>
        <AgendaInfiniteResultsLoadMore
          loadMoreLabel={loadMoreLabel ?? 'Laad meer activiteiten'}
        />
      </AgendaInfiniteResultsProvider>
    )
  }

  return (
    <>
      <div className="mt-6">
        <PlpSearchBar
          value={query}
          onChange={setQuery}
          placeholder={searchPlaceholder}
          submitLabel={searchSubmitLabel}
          basePath="/agenda"
          live
        />
      </div>

      <div className="mt-8">
        <div className="flex gap-8 items-start">
          <aside className="hidden lg:block w-72 shrink-0">
            <AgendaFilterSidebar
              filterState={liveFilterState}
              categories={categories}
              teachers={teachers}
              facets={facets}
            />
          </aside>
          <div className="flex-1 min-w-0">{resultsBody}</div>
        </div>
      </div>
    </>
  )
}
